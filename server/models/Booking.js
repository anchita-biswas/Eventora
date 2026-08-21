const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["not_paid", "paid"],
      default: "not_paid",
    },
    // One booking covers a party of up to MAX_SEATS_PER_BOOKING. The unique
    // userId+eventId index below still allows only one booking per event per
    // user, so this is how a group books together.
    seats: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 5,
    },
    // ticketPrice * seats, always computed server-side.
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
