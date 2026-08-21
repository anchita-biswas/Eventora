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
