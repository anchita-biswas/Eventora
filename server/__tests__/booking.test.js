const request = require("supertest");
const app = require("../app");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const OTP = require("../models/OTP");
const { makeUser, makeAdmin, makeEvent } = require("./testHelpers");
const db = require("./testDb");

beforeAll(async () => {
  await db.connect();
});
afterEach(async () => {
  await db.clearDatabase();
});
afterAll(async () => {
  await db.disconnect();
});

describe("Booking confirmation cannot oversell seats", () => {
  it("confirms up to availableSeats and rejects once seats run out", async () => {
    const event = await makeEvent({ totalSeats: 1, availableSeats: 1 });
    const { user: u1 } = await makeUser("u1@example.com");
    const { user: u2 } = await makeUser("u2@example.com");
    const { token: adminToken } = await makeAdmin("admin@example.com");

    const b1 = await Booking.create({
      userId: u1._id,
      eventId: event._id,
      status: "pending",
      paymentStatus: "not_paid",
      amount: 0,
    });
    const b2 = await Booking.create({
      userId: u2._id,
      eventId: event._id,
      status: "pending",
      paymentStatus: "not_paid",
      amount: 0,
    });

    const confirm1 = await request(app)
      .put(`/api/bookings/${b1._id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "paid" });
    const confirm2 = await request(app)
      .put(`/api/bookings/${b2._id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "paid" });

    expect(confirm1.status).toBe(200);
    expect(confirm2.status).toBe(400);
    expect(confirm2.body.error).toMatch(/no seat available/i);

    const finalEvent = await Event.findById(event._id);
    expect(finalEvent.availableSeats).toBe(0);
  });
});

describe("Booking cancellation ownership", () => {
  it("lets the owner cancel their own booking", async () => {
    const { user, token } = await makeUser("owner@example.com");
    const event = await makeEvent();
    const booking = await Booking.create({
      userId: user._id,
      eventId: event._id,
      status: "pending",
      paymentStatus: "not_paid",
      amount: 0,
    });

    const res = await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("blocks a different user from cancelling someone else's booking", async () => {
    const { user: owner } = await makeUser("owner2@example.com");
    const { token: strangerToken } = await makeUser("stranger@example.com");
    const event = await makeEvent();
    const booking = await Booking.create({
      userId: owner._id,
      eventId: event._id,
      status: "pending",
      paymentStatus: "not_paid",
      amount: 0,
    });

    const res = await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/bookings (create via OTP)", () => {
  it("rejects booking without a valid prior OTP", async () => {
    const { token } = await makeUser("noOtp@example.com");
    const event = await makeEvent();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired otp/i);
  });

  it("creates a pending booking once a valid OTP is supplied", async () => {
    const { user, token } = await makeUser("withOtp@example.com");
    const event = await makeEvent();
    await OTP.create({ email: user.email, otp: "123456", action: "event_booking" });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "123456" });
    expect(res.status).toBe(201);

    const booking = await Booking.findOne({ userId: user._id, eventId: event._id });
    expect(booking.status).toBe("pending");
  });

  it("prevents booking the same event twice", async () => {
    const { user, token } = await makeUser("twice@example.com");
    const event = await makeEvent();

    await OTP.create({ email: user.email, otp: "111111", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "111111" });

    await OTP.create({ email: user.email, otp: "222222", action: "event_booking" });
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "222222" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already booked/i);
  });
});
