import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-heading)] placeholder-[var(--text-body)] outline-none transition focus:border-[var(--accent-violet)] focus:ring-2 focus:ring-[var(--accent-violet)]/30";

const labelClass =
  "mb-1 block text-left text-xs font-medium text-[var(--text-heading)]/70";

const primaryBtn =
  "mt-5 rounded-lg bg-[var(--accent-violet)] px-11 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:bg-[var(--accent-violet-light)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)] disabled:opacity-60";

const ghostBtn =
  "rounded-lg border border-white/70 px-8 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-[var(--accent-violet)]";

const EyeToggle = ({ show, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={show ? "Hide password" : "Show password"}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] transition-colors hover:text-[var(--accent-violet-light)]"
  >
    {show ? <FaEyeSlash /> : <FaEye />}
  </button>
);

/* ------------------------------- Sign In ------------------------------- */
const SignInForm = ({ onSwitch }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, verifyOTP } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!showOTP) {
        const data = await login(email, password);
        if (data.role === "admin") navigate("/admin");
        else navigate("/dashboard");
      } else {
        const data = await verifyOTP(email, otp);
        if (data.role === "admin") navigate("/admin");
        else navigate("/dashboard");
      }
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setShowOTP(true);
        setError(
          err.response?.data?.error ||
            "Account not verified. A new OTP has been sent to your email.",
        );
      } else {
        setError(err.response?.data?.error || err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col items-center justify-center bg-[var(--surface-card)] px-8 py-10 text-center md:px-10"
    >
      <h1 className="text-3xl font-semibold text-[var(--text-heading)]">
        Welcome Back
      </h1>
      <p className="mt-1 mb-6 text-sm text-[var(--text-body)]">
        Sign in to your Eventora account
      </p>

      {!showOTP ? (
        <>
          <div className="w-full">
            <label htmlFor="li-email" className={labelClass}>Email Address</label>
            <input
              id="li-email"
              type="email"
              required
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mt-3 w-full">
            <label htmlFor="li-pw" className={labelClass}>Password</label>
            <div className="relative">
              <input
                id="li-pw"
                type={showPassword ? "text" : "password"}
                required
                className={`${field} pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          </div>
        </>
      ) : (
        <div className="w-full">
          <label htmlFor="li-otp" className={labelClass}>Verification Code (OTP)</label>
          <input
            id="li-otp"
            type="text"
            required
            placeholder="6-digit code"
            maxLength="6"
            className={`${field} text-center text-lg font-bold tracking-widest`}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-300">
          {typeof error === "string" ? error : "Something went wrong"}
        </p>
      )}

      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? "Processing..." : showOTP ? "Verify OTP & Log In" : "Sign In"}
      </button>

      <p className="auth-mobile-switch mt-5 text-sm text-[var(--text-body)]">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-[var(--accent-violet-light)] hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
};

/* ------------------------------- Sign Up ------------------------------- */
const SignUpForm = ({ onSwitch }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, verifyOTP } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!showOTP) {
        await register(name, email, password);
        setShowOTP(true);
        setError("");
      } else {
        await verifyOTP(email, otp);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col items-center justify-center bg-[var(--surface-card)] px-8 py-10 text-center md:px-10"
    >
      <h1 className="text-3xl font-semibold text-[var(--text-heading)]">
        Create an Account
      </h1>
      <p className="mt-1 mb-6 text-sm text-[var(--text-body)]">
        Join Eventora today
      </p>

      {!showOTP ? (
        <>
          <div className="w-full">
            <label htmlFor="su-name" className={labelClass}>Full Name</label>
            <input
              id="su-name"
              type="text"
              required
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mt-3 w-full">
            <label htmlFor="su-email" className={labelClass}>Email Address</label>
            <input
              id="su-email"
              type="email"
              required
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mt-3 w-full">
            <label htmlFor="su-pw" className={labelClass}>Password</label>
            <div className="relative">
              <input
                id="su-pw"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                pattern="(?=.*[^A-Za-z0-9]).{8,}"
                title="At least 8 characters, including at least one special character"
                className={`${field} pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            <p className="mt-1 text-left text-[11px] text-[var(--text-body)]/70">
              At least 8 characters, including one special character.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            An OTP has been sent to your email. Please verify your account.
          </p>
          <div className="mt-3 w-full">
            <label htmlFor="su-otp" className={labelClass}>Verification Code (OTP)</label>
            <input
              id="su-otp"
              type="text"
              required
              placeholder="6-digit code"
              maxLength="6"
              className={`${field} text-center text-lg font-bold tracking-widest`}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-300">
          {typeof error === "string" ? error : "Something went wrong"}
        </p>
      )}

      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? "Processing..." : showOTP ? "Verify & Complete" : "Sign Up"}
      </button>

      <p className="auth-mobile-switch mt-5 text-sm text-[var(--text-body)]">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-[var(--accent-violet-light)] hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

/* ----------------------------- Auth Portal ----------------------------- */
const AuthPortal = ({ initialMode = "signin" }) => {
  const { user } = useContext(AuthContext);
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");

  // Already signed in? Skip the auth screen and go to the right dashboard.
  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-12 py-8">
      {/* Diagonal EVENTORA watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-1/2 grid h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 grid-cols-[repeat(10,max-content)] content-center justify-center gap-x-12 gap-y-8 rotate-[-45deg]"
          style={{ fontFamily: "var(--font-display)", opacity: 0.04 }}
        >
          {Array.from({ length: 600 }).map((_, i) => (
            <span
              key={i}
              className="text-6xl font-bold uppercase leading-none tracking-tight text-[var(--accent-violet-light)] md:text-8xl"
            >
              Eventora
            </span>
          ))}
        </div>
      </div>

      {/* Ambient violet glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 40%, rgba(124,58,237,0.18), rgba(124,58,237,0) 70%)",
        }}
      />

      {/* Sliding card */}
      <div className={`auth-container relative z-10 ${isSignUp ? "auth-active" : ""}`}>
        <div className="auth-form-container auth-sign-up">
          <SignUpForm onSwitch={() => setIsSignUp(false)} />
        </div>
        <div className="auth-form-container auth-sign-in">
          <SignInForm onSwitch={() => setIsSignUp(true)} />
        </div>

        <div className="auth-toggle-container">
          <div className="auth-toggle">
            <div className="auth-toggle-panel auth-toggle-left">
              <h1 className="text-2xl font-semibold">Already have an account?</h1>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`${ghostBtn} mt-6`}
              >
                Sign In
              </button>
            </div>
            <div className="auth-toggle-panel auth-toggle-right">
              <h1 className="text-2xl font-semibold">Don't have an account?</h1>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`${ghostBtn} mt-6`}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
