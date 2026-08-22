const Booking = require("../models/Booking");
const OTP = require("../models/OTP");
const Event = require("../models/Event");
const User = require("../models/User");
const { sendOTPEmail, sendBookingEmail } = require("../utils/email");

const MAX_SEATS_PER_BOOKING = 5;

// See the note in authController.js — same flag, same reason, same lifespan.
const otpBypassed = () => process.env.OTP_BYPASS === "true";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/*
 * The seat count decides both how much inventory is held and what the user is
 * charged, so it is never taken on trust. A string, a float, a negative, or a
 * `{ $gt: 0 }` object from a crafted request all have to fall out here rather
 * than reach the $inc.
 */
const parseSeats = (value) => {
  if (value === undefined) return 1; // older clients send no seat count
  const seats = Number(value);
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS_PER_BOOKING) {
    return null;
  }
  return seats;
};

exports.sendBookingOTP = async (req, res, next) => {
  try {
    // The client asks for an OTP before it can know whether one is needed, so
    // the answer rides back in the response: `bypass` tells it to book direct.
    if (otpBypassed()) {
      return res.json({ message: "OTP not required", bypass: true });
    }

    const otp = generateOtp();
    await OTP.findOneAndDelete({
      email: req.user.email,
      action: "event_booking",
    });
    await OTP.create({
      email: req.user.email,
      otp: otp,
      action: "event_booking",
    });
    await sendOTPEmail(req.user.email, otp, "event_booking");
    res.json({ message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
};

exports.bookEvent = async (req, res, next) => {
  try {
    const { eventId, otp } = req.body;

    const seats = parseSeats(req.body.seats);
    if (seats === null) {
      return res.status(400).json({
        error: `Please pick between 1 and ${MAX_SEATS_PER_BOOKING} seats.`,
      });
    }

    if (!otpBypassed()) {
      const otpRecord = await OTP.findOne({
        email: req.user.email,
        otp,
        action: "event_booking",
      });
      if (!otpRecord) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).json({ error: "Event not found" });
    }

    const existingBooking = await Booking.findOne({
      userId: req.user._id,
      eventId,
    });
    if (existingBooking) {
      return res
        .status(400)
        .json({ error: "You have already booked this event" });
    }

    // Hold the seats now, atomically. A plain `availableSeats <= 0` read here
    // would let every concurrent request pass the same check and oversell the
    // event, because nothing was decremented until an admin confirmed. The
    // $gte guard is what makes a party of 5 all-or-nothing.
    const heldEvent = await Event.findOneAndUpdate(
      { _id: event._id, availableSeats: { $gte: seats } },
      { $inc: { availableSeats: -seats } },
      { new: true },
    );
    if (!heldEvent) {
      return res.status(400).json({
        error:
          seats === 1
            ? "No seat available"
            : `Only ${event.availableSeats} seat(s) left for this event`,
      });
    }

    try {
      await Booking.create({
        userId: req.user._id,
        eventId,
        status: "pending",
        paymentStatus: "not_paid",
        seats,
        amount: event.ticketPrice * seats,
      });
    } catch (error) {
      // The booking never existed, so nothing else will ever release these
      // seats — put them back before returning.
      await Event.findByIdAndUpdate(event._id, {
        $inc: { availableSeats: seats },
      });
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ error: "You have already booked this event" });
      }
      throw error;
    }

    await OTP.deleteMany({ email: req.user.email, action: "event_booking" });
    res.status(201).json({
      message:
        "Booking created. Please check your email for updates on your booking status.",
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmBooking = async (req, res, next) => {
  try {
    const paymentStatus = req.body.paymentStatus;
    if (!["paid", "not_paid"].includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }
    const booking = await Booking.findById(req.params.id).populate("eventId");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "confirmed") {
      return res.status(400).json({ error: "Booking is already confirmed" });
    }

    // A cancelled booking already gave its seat back, so confirming it would
    // hand out a seat that was never held.
    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking was cancelled" });
    }

    // No seat maths here: the seat was taken when the booking was created.
    booking.status = "confirmed";
    booking.paymentStatus = paymentStatus;
    await booking.save();

    // Admin confirms booking then confirmation mail sent to the booking owner
    const owner = await User.findById(booking.userId);
    if (owner) {
      await sendBookingEmail(booking, owner);
    }

    res.json({ message: "Booking confirmed" });
  } catch (error) {
    next(error);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).populate(
      "eventId",
    );
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate("eventId")
      .populate("userId", "name email");
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("eventId");
    if (!booking) {
      return res.status(400).json({ error: "Booking not found" });
    }

    const isOwner = booking.userId.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Pending bookings hold seats too, so both pending and confirmed release
    // them. The `!== "cancelled"` guard keeps a repeated cancel from handing
    // the same seats back twice. `|| 1` covers bookings made before parties
    // existed, which have no `seats` field stored.
    if (booking.status !== "cancelled" && booking.eventId) {
      await Event.findByIdAndUpdate(booking.eventId._id, {
        $inc: { availableSeats: booking.seats || 1 },
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled" });
  } catch (error) {
    next(error);
  }
};
