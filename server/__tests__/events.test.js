const request = require("supertest");
const app = require("../app");
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

describe("GET /api/events search", () => {
  beforeEach(async () => {
    await makeEvent({
      title: "Tech Conference",
      description: "All about modern tech.",
      location: "Online",
      category: "Technology",
      date: new Date(Date.now() + 86400000),
    });
  });

  it("finds events by a normal substring search", async () => {
    const res = await request(app).get("/api/events").query({ search: "Tech" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("treats regex metacharacters as literal text instead of a pattern", async () => {
    // Before the fix, ".*" as an unescaped regex matched every event.
    const res = await request(app).get("/api/events").query({ search: ".*" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it("doesn't error on an unbalanced regex-like pattern", async () => {
    const res = await request(app).get("/api/events").query({ search: "(unclosed" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe("Event admin-only mutations", () => {
  it("rejects creating an event without a token", async () => {
    const res = await request(app).post("/api/events").send({ title: "x" });
    expect(res.status).toBe(401);
  });

  it("rejects creating an event as a non-admin", async () => {
    const { token } = await makeUser("u@test.com");
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "x" });
    expect(res.status).toBe(403);
  });

  it("allows an admin to create an event", async () => {
    const { token } = await makeAdmin("a@test.com");
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "New Event",
        description: "desc",
        date: new Date(),
        location: "Loc",
        category: "Music",
        totalSeats: 5,
        ticketPrice: 100,
        image: "http://x.com/y.png",
      });
    expect(res.status).toBe(201);
    expect(res.body.availableSeats).toBe(5);
  });
});

describe("PUT /api/events/:id keeps seat counts consistent", () => {
  const baseEventBody = {
    title: "E",
    description: "d",
    date: new Date().toISOString(),
    location: "l",
    category: "c",
    ticketPrice: 0,
    image: "http://x.com/y.png",
  };

  it("raises availableSeats when capacity grows", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 2 }); // 8 booked
    const { token } = await makeAdmin("cap-up@example.com");

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...baseEventBody, totalSeats: 20 });

    expect(res.status).toBe(200);
    expect(res.body.totalSeats).toBe(20);
    expect(res.body.availableSeats).toBe(12); // 20 - 8 booked
  });

  it("never drops availableSeats below zero when capacity is cut", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 2 }); // 8 booked
    const { token } = await makeAdmin("cap-down@example.com");

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...baseEventBody, totalSeats: 5 });

    expect(res.status).toBe(200);
    expect(res.body.availableSeats).toBe(0);
  });

  it("leaves availableSeats alone when capacity is unchanged", async () => {
    const event = await makeEvent({ totalSeats: 10, availableSeats: 2 });
    const { token } = await makeAdmin("cap-same@example.com");

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...baseEventBody, totalSeats: 10 });

    expect(res.status).toBe(200);
    expect(res.body.availableSeats).toBe(2);
  });
});

describe("Errors do not leak internals", () => {
  it("turns a malformed id into a 400 without Mongoose text", async () => {
    const res = await request(app).get("/api/events/not-an-object-id");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request");
  });

  it("returns a generic message instead of the thrown error", async () => {
    const Event = require("../models/Event");
    const spy = jest
      .spyOn(Event, "find")
      .mockImplementation(() => {
        throw new Error("mongodb+srv://admin:hunter2@cluster0 timed out");
      });
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/hunter2|mongodb/i);
    expect(res.body.error).toMatch(/something went wrong/i);

    spy.mockRestore();
    errorLog.mockRestore();
  });
});
