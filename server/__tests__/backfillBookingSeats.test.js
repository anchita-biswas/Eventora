const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const backfillBookingSeats = require("../scripts/backfillBookingSeats");
const { makeUser, makeEvent } = require("./testHelpers");
const db = require("./testDb");

beforeAll(async () => {
  await db.connect();
  // The script opens and closes its own connection; in-process it has to reuse
  // the in-memory one the suite already holds.
  jest.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
  jest.spyOn(mongoose, "disconnect").mockResolvedValue(undefined);
  jest.spyOn(console, "log").mockImplementation(() => {});
  process.env.MONGODB_URI = "mongodb://in-memory";
});
afterEach(async () => {
  await db.clearDatabase();
});
afterAll(async () => {
  jest.restoreAllMocks();
  await db.disconnect();
});

// Bookings predating the seats field have no such path at all, which the
// schema can't produce — so write them through the raw collection.
async function makeLegacyBooking(userId, eventId, extra = {}) {
  const { insertedId } = await Booking.collection.insertOne({
    userId,
    eventId,
    status: "confirmed",
    paymentStatus: "paid",
    amount: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  return insertedId;
}

describe("backfillBookingSeats", () => {
  it("stamps seats: 1 onto bookings that predate the field", async () => {
    const { user } = await makeUser("legacy@example.com");
    const event = await makeEvent();
    const id = await makeLegacyBooking(user._id, event._id);

    expect(await Booking.collection.findOne({ _id: id })).not.toHaveProperty(
      "seats",
    );

    await backfillBookingSeats();

    expect((await Booking.collection.findOne({ _id: id })).seats).toBe(1);
  });

  it("leaves existing seat counts alone", async () => {
    const { user } = await makeUser("party@example.com");
    const event = await makeEvent();
    const booking = await Booking.create({
      userId: user._id,
      eventId: event._id,
      status: "confirmed",
      paymentStatus: "paid",
      seats: 4,
      amount: 2000,
    });

    await backfillBookingSeats();

    expect((await Booking.findById(booking._id)).seats).toBe(4);
  });

  it("is safe to run twice", async () => {
    const { user } = await makeUser("twice@example.com");
    const event = await makeEvent();
    const id = await makeLegacyBooking(user._id, event._id);

    await backfillBookingSeats();
    await backfillBookingSeats();

    expect((await Booking.collection.findOne({ _id: id })).seats).toBe(1);
    expect(await Booking.countDocuments({ seats: { $exists: false } })).toBe(0);
  });

  it("does nothing when every booking already records seats", async () => {
    const { user } = await makeUser("clean@example.com");
    const event = await makeEvent();
    await Booking.create({
      userId: user._id,
      eventId: event._id,
      seats: 2,
      amount: 1000,
    });

    await backfillBookingSeats();

    expect(await Booking.countDocuments({ seats: { $exists: false } })).toBe(0);
    expect(await Booking.countDocuments({ seats: 2 })).toBe(1);
  });
});
