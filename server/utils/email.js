const { Resend } = require("resend");
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
 * address that owns the API key. Verify a domain and point EMAIL_FROM at it
 * before real users are expected to receive anything.
 */
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

/*
 * Resend reports failures in the resolved response instead of throwing, so an
 * unchecked call looks identical to a successful one — which is how the SMTP
 * failure stayed invisible while the API kept telling users to check an inbox
 * that would stay empty. Callers still can't fail on this (none of them check),
 * so the least it can do is say so in the logs.
 */
const send = async (to, subject, html, label) => {
  if (!process.env.RESEND_KEY) {
    console.error(`Email skipped (${label}) to ${to}: RESEND_KEY is not set`);
    return;
  }

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`Email failed (${label}) to ${to}:`, error.message || error);
      return;
    }
    console.log(`Email sent (${label}) to ${to}`);
  } catch (err) {
    console.error(`Email threw (${label}) to ${to}:`, err.message);
  }
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
  await send(
    userEmail,
    `Booking Confirmed: ${eventTitle}`,
    `
            <h2>Hi ${userName}!</h2>
            <p>Your booking for the event <strong>${eventTitle}</strong> is successfully confirmed.</p>
            <p>Thank you for choosing Eventora.</p>`,
    "booking_confirmed",
  );
};

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

module.exports = { sendBookingEmail, sendOTPEmail };
