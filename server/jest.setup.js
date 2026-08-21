// Test-only env vars — controllers read these via process.env, and tests
// never touch the real .env / production secrets.
process.env.JWT_SECRET = "jest-test-secret-do-not-use-in-prod";
process.env.CLIENT_URL = "http://localhost:5173";
