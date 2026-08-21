import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaTicketAlt, FaBars, FaTimes } from "react-icons/fa";

// "Anchita Biswas" -> "AB", "cher" -> "C". Two words is as far as it stays
// readable inside a 40px circle.
const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

const Avatar = ({ name }) => (
  <div
    aria-hidden="true"
    className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-[var(--accent-violet)] text-sm font-bold tracking-wide text-white shadow-[0_0_18px_rgba(124,58,237,0.45)]"
  >
    {initialsOf(name)}
  </div>
);

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    // Logout clears the httpOnly session cookie server-side, so wait for it
    // before routing — otherwise the next page can load still authenticated.
    await logout();
    navigate("/login");
  };

  const linkClass =
    "text-[var(--text-body)] hover:text-[var(--text-heading)] transition-colors cursor-pointer text-[0.95rem] font-medium";

  const primaryButtonClass =
    "rounded-xl bg-[var(--accent-violet)] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:bg-[var(--accent-violet-light)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]";

  const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";

  // Name and email, shown beside the avatar on desktop and inside the drawer
  // on mobile. min-w-0 + truncate keep a long address from stretching the bar.
  const identity = user && (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
        {user.name}
      </p>
      <p className="truncate text-xs text-[var(--text-body)]" title={user.email}>
        {user.email}
      </p>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[rgba(10,10,15,0.6)] backdrop-blur-[12px]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[var(--text-heading)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <FaTicketAlt className="-rotate-45 text-[var(--accent-violet)]" />
            Eventora
          </Link>

          {/* Desktop bar */}
          <div className="hidden items-center justify-end gap-7 md:flex">
            <Link to="/#events" className={linkClass}>
              Events
            </Link>
            {user ? (
              <>
                <Link to={dashboardPath} className={linkClass}>
                  Dashboard
                </Link>
                <Link
                  to={dashboardPath}
                  className="flex max-w-56 items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  <Avatar name={user.name} />
                  {identity}
                </Link>
                <button onClick={handleLogout} className={primaryButtonClass}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>
                  Login
                </Link>
                <Link to="/register" className={primaryButtonClass}>
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile bar: the avatar stays out here, everything else folds into
              the drawer below. */}
          <div className="flex items-center gap-3 md:hidden">
            {user && (
              <Link to={dashboardPath} onClick={closeMenu} aria-label={user.name}>
                <Avatar name={user.name} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-[var(--text-heading)] transition-colors hover:bg-white/10"
            >
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="flex flex-col gap-1 border-t border-white/5 py-4 md:hidden"
          >
            {user && (
              <div className="mb-3 min-w-0 border-b border-white/5 pb-3">
                {identity}
              </div>
            )}
            <Link
              to="/#events"
              onClick={closeMenu}
              className={`${linkClass} py-2`}
            >
              Events
            </Link>
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={closeMenu}
                  className={`${linkClass} py-2`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className={`${primaryButtonClass} mt-3 w-full`}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={`${linkClass} py-2`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className={`${primaryButtonClass} mt-3 block w-full text-center`}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
