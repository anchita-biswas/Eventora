/*
 * One-shot migration: stamp `seats: 1` onto bookings made before parties
 * existed.
 *
 * Those documents have no `seats` path at all. The controllers already read
 * `booking.seats || 1`, so nothing is broken without this — but the field
 * being absent means any query or aggregate over seats (a headcount for the
 * door, seats sold per event) silently skips them. This makes the stored data
 * say what the code already assumes.
 *
 * Deliberately not run at startup: a migration that fires on every boot is a
 * write nobody asked for. Run it once, by hand:
 *
 *   npm run backfill:seats --prefix server
 *
 * Safe to run twice — the filter only matches documents still missing the
 * field, so a second run reports 0 and changes nothing.
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");
const Booking = require("../models/Booking");

dotenv.config();
// Workaround for nodejs/node#62326 — Windows c-ares SRV regression, v24.13.0+
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const backfillBookingSeats = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set — nothing to connect to.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const pending = await Booking.countDocuments({ seats: { $exists: false } });
  if (pending === 0) {
    console.log("Nothing to backfill — every booking already records seats.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${pending} booking(s) with no seat count. Setting to 1...`);
  const result = await Booking.updateMany(
    { seats: { $exists: false } },
    { $set: { seats: 1 } },
  );
  console.log(`Backfilled ${result.modifiedCount} booking(s).`);

  const remaining = await Booking.countDocuments({ seats: { $exists: false } });
  if (remaining > 0) {
    // Writes that silently do less than they claimed are worse than a failure.
    console.error(`${remaining} booking(s) still missing seats — check for a write error above.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("Done.");
  await mongoose.disconnect();
};

// Only self-run as a script; requiring it from a test just gets the function.
if (require.main === module) {
  backfillBookingSeats().catch(async (error) => {
    console.error("Backfill failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = backfillBookingSeats;
