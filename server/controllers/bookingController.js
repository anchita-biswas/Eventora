const Booking = require("../models/Booking");
const OTP = require("../models/OTP");
const Event = require("../models/Event");
const User = require("../models/User");
const { sendOTPEmail, sendBookingEmail } = require("../utils/email");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendBookingOTP = async (req, res) => {
  try {
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
    res.status(500).json({ error: error.message });
  }
};

exports.bookEvent = async (req, res) => {
  try {
    const { eventId, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email: req.user.email,
      otp,
      action: "event_booking",
    });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).json({ error: "Event not found" });
    }

    if (event.availableSeats <= 0) {
      return res.status(400).json({ error: "No seat available" });
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

    let booking;
    try {
      booking = await Booking.create({
        userId: req.user._id,
        eventId,
        status: "pending",
        paymentStatus: "not_paid",
        amount: event.ticketPrice,
      });
    } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
};

exports.confirmBooking = async (req, res) => {
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

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: booking.eventId._id, availableSeats: { $gt: 0 } },
      { $inc: { availableSeats: -1 } },
      { new: true },
    );
    if (!updatedEvent) {
      return res.status(400).json({ error: "No seat available" });
    }

    booking.status = "confirmed";
    booking.paymentStatus = paymentStatus;
    await booking.save();

    // Admin confirms booking then confirmation mail sent to the booking owner
    const owner = await User.findById(booking.userId);
    if (owner) {
      await sendBookingEmail(owner.email, owner.name, updatedEvent.title);
    }

    res.json({ message: "Booking confirmed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).populate(
      "eventId",
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("eventId")
      .populate("userId", "name email");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("eventId");
    if (!booking) {
      return res.status(400).json({ error: "Booking not found" });
    }

    const isOwner = booking.userId.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (booking.status === "confirmed" && booking.eventId) {
      await Event.findByIdAndUpdate(booking.eventId._id, {
        $inc: { availableSeats: 1 },
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
