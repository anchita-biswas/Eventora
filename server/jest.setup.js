// Test-only env vars — controllers read these via process.env, and tests
// never touch the real .env / production secrets.
process.env.JWT_SECRET = "jest-test-secret-do-not-use-in-prod";
process.env.CLIENT_URL = "http://localhost:5173";

// The real .env is loaded by utils/email.js (dotenv), which would otherwise
// leak a local OTP_BYPASS=true into whichever test files run after it.
process.env.OTP_BYPASS = "false";
