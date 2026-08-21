const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const authRoutes = require("./routes/auth.js");
const eventRoutes = require("./routes/event.js");
const bookingRoutes = require("./routes/booking.js");
const errorHandler = require("./middleware/errorHandler.js");

const app = express();

// Render puts one proxy in front of us, so req.ip is that proxy unless we say
// how many hops to trust. The rate limiters key on req.ip; without this every
// visitor shares one bucket. Deliberately 1, not `true` — trusting the whole
// X-Forwarded-For chain would let a client forge a header and get a fresh
// bucket per request.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);

/*
 * Serve the built React app. Frontend and API share one origin in
 * production, so no separate static site / CORS setup is needed.
 */
const clientDist = path.join(__dirname, "..", "client", "dist");

app.use(express.static(clientDist));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

// Last, so it catches whatever the routes above hand it.
app.use(errorHandler);

module.exports = app;
