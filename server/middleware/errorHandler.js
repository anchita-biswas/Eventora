/*
 * Single place that turns a thrown error into a response. Controllers used to
 * do `res.status(500).json({ error: error.message })`, which shipped raw
 * Mongo/Mongoose text — index names, cast details, connection strings — to the
 * browser. Clients get a fixed message; the real error goes to the logs.
 */
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(`${req.method} ${req.originalUrl} failed:`, error);

  // A malformed ObjectId in the URL is a bad request, not a server fault.
  if (error.name === "CastError") {
    return res.status(400).json({ error: "Invalid request" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: "Invalid request data" });
  }
  if (error.code === 11000) {
    return res.status(400).json({ error: "That record already exists" });
  }

  res.status(500).json({ error: "Something went wrong. Please try again." });
};

module.exports = errorHandler;
