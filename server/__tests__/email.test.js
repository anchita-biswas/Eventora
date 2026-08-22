const fs = require("fs");
const path = require("path");

/*
 * Resend answers a rejected send with an `error` field on a resolved promise,
 * so the failure path is the one worth pinning down: it used to be swallowed,
 * and the API went on telling users to check an inbox that stayed empty.
 */
const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send: mockSend } })),
}));

let sendOTPEmail;
let sendBookingEmail;
let ticketPayload;

beforeAll(() => {
  process.env.RESEND_KEY = "re_test_key";
  ({ sendOTPEmail, sendBookingEmail, ticketPayload } = require("../utils/email"));
});

beforeEach(() => {
  mockSend.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const booking = () => ({
  _id: "6600000000000000000000aa",
  seats: 2,
  amount: 900,
  paymentStatus: "paid",
  eventId: {
    title: "Night Market",
    location: "Warehouse 9",
    date: new Date("2026-09-01T18:30:00.000Z"),
  },
});
const user = () => ({ name: "Ana", email: "ana@example.com" });

describe("OTP mail", () => {
  it("throws when Resend rejects it, instead of reporting success", async () => {
    mockSend.mockResolvedValue({
      error: { message: "You can only send testing emails to your own address" },
    });
    await expect(sendOTPEmail("someone@example.com", "123456", "event_booking"))
      .rejects.toThrow(/only send testing emails/);
  });

  it("resolves when the mail goes out", async () => {
    mockSend.mockResolvedValue({ data: { id: "abc" }, error: null });
    await expect(
      sendOTPEmail("someone@example.com", "123456", "event_booking"),
    ).resolves.toBeUndefined();
  });
});

describe("Booking confirmation mail", () => {
  it("carries the entry pass as an inline PNG the HTML points at by cid", async () => {
    mockSend.mockResolvedValue({ data: { id: "abc" }, error: null });
    await sendBookingEmail(booking(), user());

    const sent = mockSend.mock.calls[0][0];
    expect(sent.to).toBe("ana@example.com");
    expect(sent.attachments).toHaveLength(1);

    const [qr] = sent.attachments;
    expect(qr.contentType).toBe("image/png");
    // Inline, not a data: URI — Gmail strips those out of <img>.
    expect(sent.html).toContain(`src="cid:${qr.contentId}"`);
    // Base64, not a Buffer: the SDK drops `content` straight into a JSON body.
    expect(typeof qr.content).toBe("string");
    expect(Buffer.from(qr.content, "base64").subarray(1, 4).toString()).toBe("PNG");
  });

  // The booking row is already saved by then, so this one must not sink the
  // request — a 500 would only make the admin re-confirm an already-confirmed
  // booking.
  it("swallows a failed send", async () => {
    mockSend.mockResolvedValue({ error: { message: "domain not verified" } });
    await expect(sendBookingEmail(booking(), user())).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("domain not verified"),
    );
  });
});

/*
 * The dashboard builds the same payload in its own runtime, and a scanner has
 * to read either pass identically. Nothing but this test notices if one side
 * gains or loses a field.
 */
it("encodes the same ticket fields as the dashboard pass", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "..", "client", "src", "pages", "UserDashboard.jsx"),
    "utf8",
  );
  const clientBody = src.match(
    /export const ticketPayload[\s\S]*?JSON\.stringify\(\{([\s\S]*?)\}\);/,
  );
  expect(clientBody).not.toBeNull();
  const clientKeys = [...clientBody[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);

  expect(Object.keys(JSON.parse(ticketPayload(booking(), user())))).toEqual(
    clientKeys,
  );
});
