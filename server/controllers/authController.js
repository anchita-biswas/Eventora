const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require("../utils/email");

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/*
 * The session token goes out as an httpOnly cookie rather than something the
 * client stores itself: localStorage is readable by any script on the page, so
 * one XSS was a full 7-day account takeover. sameSite "lax" is enough because
 * the API and the bundle share an origin in production, and the Vite dev
 * server proxies /api so they share one in development too.
 */
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS,
  });
};

// Register User
exports.registerUser = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    if (!req.body.email || !name) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
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
    next(error);
  }
};

// Login User
exports.loginUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!req.body.email || !password) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const email = req.body.email.toLowerCase().trim();

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

    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token);
    res.json({
      message: "Login successful",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!req.body.email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
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
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }
    await OTP.deleteMany({ email, action: "account_verification" });
    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token);
    res.json({
      message: "Account verified successfully. You can now login.",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Logging out has to happen server-side now: the client can't clear an
// httpOnly cookie itself.
exports.logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out" });
};
