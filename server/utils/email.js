const { Resend } = require("resend");
const QRCode = require("qrcode");
const dotenv = require("dotenv");
dotenv.config();

/*
 * Resend talks HTTPS on 443 rather than SMTP. Render blocks outbound SMTP, so
 * nodemailer's connection to Gmail never opened there — it hung for the full
 * 120s default connection timeout and the mail was never sent.
 */
// Constructed only when the key exists: the Resend constructor throws on a
// missing key, and this module is required all the way up to app.js, so an
// unset RESEND_KEY would take the whole server down at startup rather than
// just cost us an email.
const resend = process.env.RESEND_KEY
  ? new Resend(process.env.RESEND_KEY)
  : null;

/*
 * onboarding@resend.dev is Resend's shared sender and only delivers to the
 * address that owns the API key — every other recipient comes back as a 403
 * validation_error. Verify a domain and point EMAIL_FROM at it before real
 * users are expected to receive anything.
 */
const SHARED_SENDER = "onboarding@resend.dev";
const FROM = process.env.EMAIL_FROM || SHARED_SENDER;

if (FROM === SHARED_SENDER) {
  console.warn(
    `EMAIL_FROM is not set, so mail is sent from ${SHARED_SENDER}. Resend only ` +
      `delivers that sender to the account owner's own address; everyone else ` +
      `will get nothing. Verify a domain at resend.com/domains and set EMAIL_FROM.`,
  );
}

/*
 * Resend reports failures in the resolved response instead of throwing, so an
 * unchecked call looks identical to a successful one — which is how the SMTP
 * failure stayed invisible while the API kept telling users to check an inbox
 * that would stay empty. Every failure throws now; each caller decides whether
 * that should sink its request.
 */
const send = async (to, subject, html, label, attachments) => {
  if (!process.env.RESEND_KEY) {
    throw new Error(`Email skipped (${label}) to ${to}: RESEND_KEY is not set`);
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
  if (error) {
    throw new Error(
      `Email failed (${label}) to ${to}: ${error.message || JSON.stringify(error)}`,
    );
  }
  console.log(`Email sent (${label}) to ${to}`);
};

/*
 * Mirrors `ticketPayload` in client/src/pages/UserDashboard.jsx so the pass in
 * the mail and the pass on the dashboard encode byte-for-byte the same thing —
 * one scanner, one ticket, whichever the visitor holds up at the door.
 *
 * ponytail: two copies, one per runtime (the client is ESM under Vite, this is
 * CommonJS). Kept in step by hand and by the test that pins the key set; hoist
 * to a shared module the moment a third caller needs it.
 */
const ticketPayload = (booking, user) =>
  JSON.stringify({
    ticket: booking._id,
    name: user?.name,
    email: user?.email,
    event: booking.eventId?.title,
    venue: booking.eventId?.location,
    date: booking.eventId?.date,
    pax: booking.seats || 1,
    amount: booking.amount,
    payment: booking.paymentStatus,
  });

/*
 * The QR rides along as an inline attachment referenced by `cid:`, not a data:
 * URI — Gmail strips data: URIs out of <img> and the pass would show as a
 * broken image. `margin: 2` keeps the white quiet zone a scanner needs.
 */
const QR_CID = "entrypass";

const ticketQrAttachment = async (booking, user) => {
  const png = await QRCode.toBuffer(ticketPayload(booking, user), {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 2,
  });
  return {
    // The SDK hands `content` straight to a JSON body, so a raw Buffer would
    // arrive as {"type":"Buffer","data":[…]}. Base64 is what the API wants.
    content: png.toString("base64"),
    filename: "eventora-entry-pass.png",
    contentType: "image/png",
    contentId: QR_CID,
  };
};

/*
 * Sent only when an admin approves the booking — a pending booking holds seats
 * but is not a ticket yet, and the QR it would carry says "confirmed" about
 * something nobody has confirmed.
 *
 * A mail failure must not fail the request: the booking row is already saved by
 * the time this runs, and a 500 would only make the admin re-confirm a booking
 * that is already confirmed. Log it and move on.
 */
const sendBookingEmail = async (booking, user) => {
  const seats = booking.seats || 1;
  const seatLabel = `${seats} ${seats === 1 ? "seat" : "seats"}`;
  const eventTitle = booking.eventId?.title || "your event";

  try {
    const qr = await ticketQrAttachment(booking, user);
    await send(
      user.email,
      `Booking Confirmed: ${eventTitle}`,
      `
            <h2>Hi ${user.name}!</h2>
            <p>Your booking for the event <strong>${eventTitle}</strong> is successfully confirmed.</p>
            <p>Seats reserved: <strong>${seatLabel}</strong>.</p>
            <p>Show the entry pass below at the door.</p>
            <div style="margin: 20px 0; padding: 16px; background: #ffffff; display: inline-block; border: 1px solid #e5e5e5; border-radius: 8px;">
              <img src="cid:${QR_CID}" width="220" height="220" alt="Entry pass QR code for ${eventTitle}" style="display: block;" />
            </div>
            <p style="color: #666; font-size: 13px;">Admits ${seats} · ${booking.paymentStatus === "paid" ? "Paid" : "Payment pending"}. The same pass is on your Eventora dashboard, and it is attached to this email if your mail app hides images.</p>
            <p>Thank you for choosing Eventora.</p>`,
      "booking_confirmed",
      [qr],
    );
  } catch (err) {
    console.error(err.message);
  }
};

/*
 * This one throws on purpose. Without the OTP in hand the user cannot register
 * or book at all, so answering "check your email" after the mail bounced is
 * the worst possible outcome — let the request fail visibly instead.
 */
const sendOTPEmail = async (email, otp, type) => {
  const title =
    type === "account_verification"
      ? "Verify your Eventora Account"
      : "Eventora Booking Verification";
  const msg =
    type === "account_verification"
      ? "Please use the following OTP to verify your new Eventora account."
      : "Please use the following OTP to verify and confirm your event booking.";

  await send(
    email,
    "Your OTP Code",
    `
      <div style="font-family: Arial; sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #111">${title}</h2>
        <p style="color: #555; font-size: 16px;">${msg}</p>
        <div style="margin: 20px auto; padding: 15px; font-size:24px; font-weight:bold; background: #f4f4f4; letter-spacing: 5px;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
      </div>`,
    type,
  );
};

module.exports = { sendBookingEmail, sendOTPEmail, ticketPayload };
