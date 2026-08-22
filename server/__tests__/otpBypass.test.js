const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { makeUser, makeEvent } = require("./testHelpers");
const db = require("./testDb");

jest.mock("../utils/email", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingEmail: jest.fn().mockResolvedValue(undefined),
}));

/*
 * OTP_BYPASS is a temporary demo switch, but it short-circuits the only check
 * standing between a visitor and a confirmed booking — so what it does when
 * it is on gets pinned down here rather than discovered in production.
 *
 * The flag is read per call, not captured at import, which is what lets it be
 * flipped inside a running suite.
 */
beforeAll(async () => {
  await db.connect();
  process.env.OTP_BYPASS = "true";
});
afterEach(async () => {
  await db.clearDatabase();
});
afterAll(async () => {
  process.env.OTP_BYPASS = "false";
  await db.disconnect();
});

describe("OTP_BYPASS=true", () => {
  it("registers an already-verified account and signs it straight in", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Demo",
      email: "demo@example.com",
      password: "password!1",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe("user");
    const user = await User.findOne({ email: "demo@example.com" });
    expect(user.isVerified).toBe(true);
    expect(await OTP.countDocuments()).toBe(0);
  });

  it("lets an account registered before the bypass log in unverified", async () => {
    await User.create({
      name: "Old",
      email: "old@example.com",
      password: await bcrypt.hash("password!1", 10),
      role: "user",
      isVerified: false,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "old@example.com", password: "password!1" });

    expect(res.status).toBe(200);
    expect(res.body.needsVerification).toBeUndefined();
  });

  it("books without an OTP and tells the client not to ask for one", async () => {
    const { token } = await makeUser("booker@example.com");
    const event = await makeEvent({ totalSeats: 5, availableSeats: 5 });

    const otpRes = await request(app)
      .post("/api/bookings/send-otp")
      .set("Authorization", `Bearer ${token}`);
    expect(otpRes.body.bypass).toBe(true);
    expect(await OTP.countDocuments()).toBe(0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event._id, seats: 2 });

    expect(res.status).toBe(201);
    expect((await require("../models/Event").findById(event._id)).availableSeats).toBe(3);
  });
});
