import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaTicketAlt } from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass =
    "text-[var(--text-body)] hover:text-[var(--text-heading)] transition-colors cursor-pointer text-[0.95rem] font-medium";

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/5 bg-[rgba(10,10,15,0.6)] backdrop-blur-[12px]"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3.5 gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[var(--text-heading)] text-xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <FaTicketAlt className="-rotate-45 text-[var(--accent-violet)]" />
            Eventora
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-7">
            <Link to="/" className={linkClass}>
              Events
            </Link>
            {user ? (
              <>
                <Link
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  className={linkClass}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-[var(--accent-violet)] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:bg-[var(--accent-violet-light)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[var(--accent-violet)] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:bg-[var(--accent-violet-light)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
