const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const User = require("../models/User");
const OTP = require("../models/OTP");
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

describe("POST /api/auth/register", () => {
  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "short@example.com",
      password: "abc123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it("rejects a password with no special character", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "nospecial@example.com",
      password: "abcdefgh",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/special character/i);
  });

  it("creates an unverified user and an OTP for a strong password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "strong@example.com",
      password: "abcdefg!",
    });
    expect(res.status).toBe(201);

    const user = await User.findOne({ email: "strong@example.com" });
    expect(user).toBeTruthy();
    expect(user.isVerified).toBe(false);
    expect(user.role).toBe("user"); // role can't be set from the request body

    const otp = await OTP.findOne({
      email: "strong@example.com",
      action: "account_verification",
    });
    expect(otp).toBeTruthy();
  });

  it("rejects registering an email that already exists", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "dupe@example.com",
      password: "abcdefg!",
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "Test2",
      email: "dupe@example.com",
      password: "abcdefg!",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe("POST /api/auth/login", () => {
  async function createVerifiedUser(email, password) {
    const hashed = await bcrypt.hash(password, 10);
    return User.create({
      name: "Existing",
      email,
      password: hashed,
      role: "user",
      isVerified: true,
    });
  }

  it("returns the same generic error for a nonexistent email and a wrong password", async () => {
    await createVerifiedUser("real@example.com", "correcthorse!1");

    const noSuchUser = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@example.com",
      password: "whatever!1",
    });
    const wrongPassword = await request(app).post("/api/auth/login").send({
      email: "real@example.com",
      password: "wrongpassword!1",
    });

    expect(noSuchUser.status).toBe(400);
    expect(wrongPassword.status).toBe(400);
    expect(noSuchUser.body.error).toBe(wrongPassword.body.error);
  });

  it("logs in successfully with correct credentials and returns a token", async () => {
    await createVerifiedUser("login-ok@example.com", "correcthorse!1");
    const res = await request(app).post("/api/auth/login").send({
      email: "login-ok@example.com",
      password: "correcthorse!1",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe("user");
  });

  it("re-sends an OTP instead of logging in an unverified account", async () => {
    const hashed = await bcrypt.hash("correcthorse!1", 10);
    await User.create({
      name: "Unverified",
      email: "unverified@example.com",
      password: hashed,
      role: "user",
      isVerified: false,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "unverified@example.com",
      password: "correcthorse!1",
    });
    expect(res.status).toBe(400);
    expect(res.body.needsVerification).toBe(true);
  });
});
