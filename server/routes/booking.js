const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const { bookingOtpLimiter } = require("../middleware/rateLimit");
const {
  bookEvent,
  sendBookingOTP,
  getMyBookings,
  getAllBookings,
  confirmBooking,
  cancelBooking,
} = require("../controllers/bookingController");

router.post("/", protect, bookingOtpLimiter, bookEvent);
router.post("/send-otp", protect, bookingOtpLimiter, sendBookingOTP);
router.get("/my", protect, getMyBookings);
router.get("/all", protect, admin, getAllBookings);
router.put("/:id/confirm", protect, admin, confirmBooking);
router.delete("/:id", protect, cancelBooking);

module.exports = router;
