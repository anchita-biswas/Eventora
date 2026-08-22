const request = require("supertest");
const app = require("../app");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const OTP = require("../models/OTP");
const { makeUser, makeAdmin, makeEvent } = require("./testHelpers");
const db = require("./testDb");

jest.mock("../utils/email", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingEmail: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  await db.connect();
});
afterEach(async () => {
  await db.clearDatabase();
});
afterAll(async () => {
  await db.disconnect();
});

describe("Seats are held when the booking is created", () => {
  it("rejects a second booking once the last seat is taken", async () => {
    const event = await makeEvent({ totalSeats: 1, availableSeats: 1 });
    const { user: u1, token: t1 } = await makeUser("u1@example.com");
    const { user: u2, token: t2 } = await makeUser("u2@example.com");

    await OTP.create({ email: u1.email, otp: "111111", action: "event_booking" });
    const first = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${t1}`)
      .send({ eventId: event._id, otp: "111111" });
    expect(first.status).toBe(201);
    expect((await Event.findById(event._id)).availableSeats).toBe(0);

    await OTP.create({ email: u2.email, otp: "222222", action: "event_booking" });
    const second = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${t2}`)
      .send({ eventId: event._id, otp: "222222" });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/no seat available/i);

    expect((await Event.findById(event._id)).availableSeats).toBe(0);
    expect(await Booking.countDocuments({ eventId: event._id })).toBe(1);
  });

  it("does not decrement a second time when an admin confirms", async () => {
    const event = await makeEvent({ totalSeats: 2, availableSeats: 2 });
    const { user, token } = await makeUser("confirmable@example.com");
    const { token: adminToken } = await makeAdmin("admin@example.com");

    await OTP.create({ email: user.email, otp: "333333", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "333333" });

    const booking = await Booking.findOne({ userId: user._id });
    const confirm = await request(app)
      .put(`/api/bookings/${booking._id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "paid" });

    expect(confirm.status).toBe(200);
    expect((await Event.findById(event._id)).availableSeats).toBe(1);
  });

  it("releases the seat when a pending booking is cancelled", async () => {
    const event = await makeEvent({ totalSeats: 1, availableSeats: 1 });
    const { user, token } = await makeUser("releaser@example.com");

    await OTP.create({ email: user.email, otp: "444444", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "444444" });
    expect((await Event.findById(event._id)).availableSeats).toBe(0);

    const booking = await Booking.findOne({ userId: user._id });
    await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect((await Event.findById(event._id)).availableSeats).toBe(1);
  });

  it("does not give the seat back twice when cancelled twice", async () => {
    const event = await makeEvent({ totalSeats: 1, availableSeats: 1 });
    const { user, token } = await makeUser("doublecancel@example.com");

    await OTP.create({ email: user.email, otp: "555555", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "555555" });

    const booking = await Booking.findOne({ userId: user._id });
    await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect((await Event.findById(event._id)).availableSeats).toBe(1);
  });

  it("refuses to confirm a cancelled booking", async () => {
    const event = await makeEvent({ totalSeats: 1, availableSeats: 1 });
    const { user, token } = await makeUser("cancelled@example.com");
    const { token: adminToken } = await makeAdmin("admin2@example.com");

    await OTP.create({ email: user.email, otp: "666666", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "666666" });

    const booking = await Booking.findOne({ userId: user._id });
    await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    const confirm = await request(app)
      .put(`/api/bookings/${booking._id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "paid" });

    expect(confirm.status).toBe(400);
    expect((await Event.findById(event._id)).availableSeats).toBe(1);
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

describe("Booking a party of seats", () => {
  async function bookSeats(token, email, eventId, seats, otp) {
    await OTP.create({ email, otp, action: "event_booking" });
    return request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId, otp, seats });
  }

  it("holds every seat of the party and charges for all of them", async () => {
    const event = await makeEvent({
      totalSeats: 10,
      availableSeats: 10,
      ticketPrice: 200,
    });
    const { user, token } = await makeUser("party@example.com");

    const res = await bookSeats(token, user.email, event._id, 4, "100001");
    expect(res.status).toBe(201);

    const booking = await Booking.findOne({ userId: user._id });
    expect(booking.seats).toBe(4);
    expect(booking.amount).toBe(800); // 200 * 4
    expect((await Event.findById(event._id)).availableSeats).toBe(6);
  });

  it("defaults to a single seat when none is sent", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 10 });
    const { user, token } = await makeUser("nosize@example.com");

    await OTP.create({ email: user.email, otp: "100002", action: "event_booking" });
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "100002" });

    expect(res.status).toBe(201);
    expect((await Booking.findOne({ userId: user._id })).seats).toBe(1);
    expect((await Event.findById(event._id)).availableSeats).toBe(9);
  });

  it("rejects a party larger than the 5-seat cap", async () => {
    const event = await makeEvent({ totalSeats: 50, availableSeats: 50 });
    const { user, token } = await makeUser("toobig@example.com");

    const res = await bookSeats(token, user.email, event._id, 6, "100003");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/between 1 and 5/i);
    expect((await Event.findById(event._id)).availableSeats).toBe(50);
  });

  it.each([[0], [-2], [2.5], ["three"], [{ $gt: 0 }], [null]])(
    "rejects a seat count of %p without touching inventory",
    async (seats) => {
      const event = await makeEvent({ totalSeats: 20, availableSeats: 20 });
      const { user, token } = await makeUser(`bad-${Math.random()}@example.com`);

      const res = await bookSeats(token, user.email, event._id, seats, "100004");
      expect(res.status).toBe(400);
      expect((await Event.findById(event._id)).availableSeats).toBe(20);
      expect(await Booking.countDocuments({})).toBe(0);
    },
  );

  it("takes the whole party or nothing when seats run short", async () => {
    const event = await makeEvent({ totalSeats: 3, availableSeats: 3 });
    const { user, token } = await makeUser("shortfall@example.com");

    const res = await bookSeats(token, user.email, event._id, 4, "100005");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only 3 seat/i);
    expect((await Event.findById(event._id)).availableSeats).toBe(3);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  it("gives the whole party back on cancel", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 10 });
    const { user, token } = await makeUser("partycancel@example.com");

    await bookSeats(token, user.email, event._id, 5, "100006");
    expect((await Event.findById(event._id)).availableSeats).toBe(5);

    const booking = await Booking.findOne({ userId: user._id });
    await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect((await Event.findById(event._id)).availableSeats).toBe(10);
  });
});

describe("Confirmation email", () => {
  const { sendBookingEmail } = require("../utils/email");

  it("tells the user how many seats were reserved", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 10 });
    const { user, token } = await makeUser("mailparty@example.com");
    const { token: adminToken } = await makeAdmin("mailadmin@example.com");

    await OTP.create({ email: user.email, otp: "200001", action: "event_booking" });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, otp: "200001", seats: 3 });

    const booking = await Booking.findOne({ userId: user._id });
    await request(app)
      .put(`/api/bookings/${booking._id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "paid" });

    // The whole booking goes over now, not four scalars: the mail builds the
    // entry-pass QR and that needs the event, the amount and the payment state.
    // Last call, not the first: an earlier test in this file confirms a
    // booking too and the module mock is shared across the suite.
    const [sentBooking, sentUser] = sendBookingEmail.mock.calls.at(-1);
    expect(sentBooking.seats).toBe(3);
    expect(sentBooking.eventId.title).toBe(event.title);
    expect(sentBooking.paymentStatus).toBe("paid");
    expect(sentUser.email).toBe(user.email);
  });
});
