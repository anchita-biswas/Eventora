const jwt = require("jsonwebtoken");
const User = require("../models/User");

// User Authentication Middleware
const protect = async (req, res, next) => {
  // The browser sends the token as an httpOnly cookie, which script on the
  // page cannot read — so an XSS bug can no longer walk off with a 7-day
  // session. The Bearer header is still accepted for non-browser callers.
  const bearer =
    req.headers.authorization && req.headers.authorization.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : null;
  let token = req.cookies?.token || bearer;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res
          .status(401)
          .json({ error: "Not authorized, user not found" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ error: "Not authorized, no token" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ error: "Forbidden, admin access required" });
  }
};


module.exports = {protect, admin}