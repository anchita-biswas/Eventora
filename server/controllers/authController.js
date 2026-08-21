const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require("../utils/email");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const hasMinLength = (password || "").length >= 8;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password || "");
    if (!hasMinLength || !hasSpecialChar) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long and include at least one special character.",
      });
    }

    let userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ email, otp, action: "account_verification" });
    await sendOTPEmail(email, otp, "account_verification");

    res.status(201).json({
      message:
        "User registered successfully. Please check your email for OTP to verify your account.",
      email: user.email,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;

    // Same generic error for "no such account" and "wrong password" —
    // distinguishing them lets an attacker enumerate registered emails.
    const invalidCredentials = () =>
      res.status(400).json({ error: "Invalid email or password" });

    let user = await User.findOne({ email });
    if (!user) {
      return invalidCredentials();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return invalidCredentials();
    }

    if (!user.isVerified && user.role === "user") {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await OTP.deleteMany({ email, action: "account_verification" });
      await OTP.create({ email, otp, action: "account_verification" });
      await sendOTPEmail(email, otp, "account_verification");
      return res.status(400).json({
        error: "Account not verified. A new OTP has been sent to your email.",
        needsVerification: true,
      });
    }

    res.json({
      message: "Login successful",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.body.email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({
      email,
      otp,
      action: "account_verification",
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true },
    );
    await OTP.deleteMany({ email, action: "account_verification" });
    res.json({
      message: "Account verified successfully. You can now login.",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
