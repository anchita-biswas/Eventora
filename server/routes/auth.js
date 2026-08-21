const express = require("express");
const router = express.Router();
const { authLimiter, registerLimiter } = require("../middleware/rateLimit");
const {
  registerUser,
  loginUser,
  verifyOTP,
  logoutUser,
} = require("../controllers/authController");

router.post("/register", registerLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/logout", logoutUser);

module.exports = router;
