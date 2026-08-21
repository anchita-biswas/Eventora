import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/axios";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaRegClock,
  FaTicketAlt,
  FaShieldAlt,
} from "react-icons/fa";
import Watermark from "../components/Watermark";

const CATEGORIES = ["Music", "Technology", "Art", "Business"];

const Home = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const location = useLocation();

  /*
   * The navbar's "Events" link points at /#events. React Router owns
   * navigation, so the browser never does its own hash scroll — this does it
   * instead. Keyed on `location` rather than `location.hash` so clicking the
   * link again while already parked on /#events still scrolls back up to the
   * list. Smoothness and reduced-motion come from `scroll-behavior` in the
   * stylesheet, so no options are passed here.
   */
  useEffect(() => {
    if (location.hash !== "#events") return;
    document.getElementById("events")?.scrollIntoView();
  }, [location]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEvents();
    }, 400); // 400ms debounce
    return () => clearTimeout(timeoutId);
  }, [search, activeCategory]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeCategory) params.set("category", activeCategory);
      const { data } = await api.get(`/events?${params.toString()}`);
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen text-[var(--text-body)]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden">
        {/* Concert background image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=3000&auto=format&fit=crop')] bg-cover bg-center" />
        {/* Violet radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 32%, rgba(124,58,237,0.32), rgba(124,58,237,0) 70%)",
          }}
        />
        {/* Heavy black gradient overlay — keeps the headline legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.78) 45%, var(--bg-base) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24 pb-28 md:pt-32 md:pb-36 flex flex-col items-center text-center">
          <span className="mb-7 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-heading)] backdrop-blur-md">
            Welcome to Eventora
          </span>

          <h1
            className="max-w-4xl text-4xl font-bold uppercase leading-[1.05] tracking-[-0.02em] text-[var(--text-heading)] sm:text-6xl md:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Find Your Next{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-violet-light)] to-[var(--accent-violet)]">
              Unforgettable
            </span>{" "}
            Experience
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-body)] sm:text-lg">
            Discover the best tech conferences, late-night music festivals, and
            hands-on workshops happening directly in your area. Secure your spot
            today.
          </p>

          {/* Floating frosted search pill */}
          <div className="mt-10 w-full max-w-3xl rounded-[28px] border border-white/10 bg-[rgba(21,21,30,0.5)] p-2 pl-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-[16px] md:rounded-full">
            <div className="flex items-center gap-3">
              <FaSearch className="shrink-0 text-[var(--text-body)]" />
              <input
                type="text"
                placeholder="Search events by title..."
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-[var(--text-heading)] placeholder-[var(--text-body)] focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Category chips */}
              <div className="hidden items-center gap-2 md:flex">
                {CATEGORIES.map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setActiveCategory((prev) => (prev === cat ? "" : cat))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-[var(--accent-violet)] text-white shadow-[0_0_18px_rgba(124,58,237,0.5)]"
                          : "bg-white/5 text-[var(--text-body)] hover:bg-white/10 hover:text-[var(--text-heading)]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Circular violet search button */}
              <button
                type="button"
                aria-label="Search"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-violet)] text-white shadow-[0_0_22px_rgba(124,58,237,0.5)] transition-all hover:bg-[var(--accent-violet-light)] hover:shadow-[0_0_30px_rgba(124,58,237,0.65)]"
              >
                <FaSearch />
              </button>
            </div>

            {/* Chips on small screens */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-1 pb-2 md:hidden">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setActiveCategory((prev) => (prev === cat ? "" : cat))
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-[var(--accent-violet)] text-white shadow-[0_0_18px_rgba(124,58,237,0.5)]"
                        : "bg-white/5 text-[var(--text-body)] hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= FEATURE STRIP ========================= */}
      <section className="bg-[var(--surface-card)]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-6 px-6 py-5 sm:flex-row sm:gap-14">
          <div className="flex items-center gap-3">
            <FaRegClock className="text-lg text-[var(--accent-violet-light)]" />
            <span className="text-sm font-medium text-[var(--text-heading)]">
              Fast Booking
            </span>
          </div>
          <div className="flex items-center gap-3">
            <FaTicketAlt className="text-lg text-[var(--accent-violet-light)]" />
            <span className="text-sm font-medium text-[var(--text-heading)]">
              Seamless Access
            </span>
          </div>
          <div className="flex items-center gap-3">
            <FaShieldAlt className="text-lg text-[var(--accent-violet-light)]" />
            <span className="text-sm font-medium text-[var(--text-heading)]">
              Secure Platform
            </span>
          </div>
        </div>
      </section>

      {/* ======================= UPCOMING EVENTS ======================= */}
      {/* scroll-mt clears the sticky navbar so the heading isn't hidden under it */}
      <section id="events" className="relative scroll-mt-24 overflow-hidden">
        <Watermark className="pointer-events-none absolute inset-0 select-none overflow-hidden" />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
            <h2
              className="text-3xl font-semibold tracking-tight text-[var(--text-heading)] sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Upcoming Events
            </h2>
            <div className="font-medium text-[var(--text-body)]">
              {events.length} results found
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xl font-semibold text-[var(--text-body)]">
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="py-20 text-center text-xl text-[var(--text-body)]">
              No events found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="group flex flex-col overflow-hidden rounded-[18px] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:-translate-y-1"
                  style={{
                    background:
                      "linear-gradient(to bottom, #1d1d29 0%, var(--surface-card) 22%)",
                  }}
                >
                  <div className="relative h-52 overflow-hidden bg-[#1d1d29]">
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--text-body)]">
                        {event.category || "Event"}
                      </div>
                    )}
                    <div className="absolute right-4 top-4 rounded-full bg-[var(--accent-violet)] px-3 py-1 text-sm font-bold text-white shadow-[0_0_18px_rgba(124,58,237,0.5)]">
                      {event.ticketPrice === 0 ? "FREE" : `₹${event.ticketPrice}`}
                    </div>
                  </div>

                  <div className="flex grow flex-col p-6">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-violet-light)]">
                      {event.category}
                    </div>
                    <h3
                      className="mb-4 text-xl font-semibold leading-snug text-[var(--text-heading)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {event.title}
                    </h3>

                    <div className="mb-5 flex flex-col gap-2 text-sm text-[var(--text-body)]">
                      <div className="flex items-center gap-2.5">
                        <FaCalendarAlt className="text-[var(--accent-violet)]" />
                        <span>
                          {new Date(event.date).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <FaMapMarkerAlt className="text-[var(--accent-violet)]" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-[var(--accent-violet)] shadow-[0_0_10px_rgba(124,58,237,0.7)]"
                          style={{
                            width: `${(event.availableSeats / event.totalSeats) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="mb-5 text-xs text-[var(--text-body)]">
                        {event.availableSeats} of {event.totalSeats} seats
                        remaining
                      </p>
                      <Link
                        to={`/events/${event._id}`}
                        className="block w-full rounded-xl border border-[var(--accent-violet)] py-2.5 text-center font-semibold text-[var(--accent-violet-light)] transition-all hover:bg-[var(--accent-violet)] hover:text-white hover:shadow-[0_0_22px_rgba(124,58,237,0.45)]"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="mt-auto border-t border-white/10 px-6 pb-10 pt-16 text-center">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <FaTicketAlt className="-rotate-45 text-2xl text-[var(--accent-violet)]" />
          <span
            className="text-xl font-semibold text-[var(--text-heading)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Eventora
          </span>
        </div>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[var(--text-body)]">
          The simplest, most dynamic way to manage, discover, and host
          world-class events in your local city. Let's make memories together.
        </p>
        <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--text-body)]/70">
          &copy; {new Date().getFullYear()} Eventora Platform. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
