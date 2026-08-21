import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/axios";
import { useNavigate } from "react-router-dom";
import Watermark from "../components/Watermark";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEventForm, setShowEventForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "",
    totalSeats: "",
    ticketPrice: "",
    image: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [eventsRes, bookingsRes] = await Promise.all([
        api.get("/events"),
        api.get("/bookings/all"),
      ]);
      setEvents(eventsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error("Error fetching admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post("/events", formData);
      setShowEventForm(false);
      setFormData({
        title: "",
        description: "",
        date: "",
        location: "",
        category: "",
        totalSeats: "",
        ticketPrice: "",
        image: "",
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error creating event");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await api.delete(`/events/${id}`);
        fetchData();
      } catch (error) {
        alert("Error deleting event");
      }
    }
  };

  const handleConfirmBooking = async (id, paymentStatus) => {
    try {
      await api.put(`/bookings/${id}/confirm`, { paymentStatus });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error confirming booking");
    }
  };

  const handleCancelBooking = async (id) => {
    if (window.confirm("Cancel this user's booking request?")) {
      try {
        await api.delete(`/bookings/${id}`);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.error || "Error cancelling booking");
      }
    }
  };

  if (loading)
    return (
      <div className="text-center py-20 text-xl font-semibold text-[var(--text-body)]">
        Loading admin panel...
      </div>
    );

  const adminInput =
    "px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-heading)] placeholder-[var(--text-body)] focus:outline-none focus:border-[var(--accent-violet)] focus:ring-2 focus:ring-[var(--accent-violet)]/30 transition";

  return (
    <>
      <Watermark />
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 sm:p-8 mb-8 border border-white/10 shadow-[0_24px_60px_-25px_rgba(0,0,0,0.85)] flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left bg-linear-to-r from-[var(--accent-violet)]/25 via-[var(--surface-card)] to-[var(--surface-card)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-heading)] mb-2">
              Admin Dashboard
            </h1>
            <p className="text-[var(--text-body)]">
              Manage events and manually confirm bookings.
            </p>
          </div>
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="w-full md:w-auto bg-[var(--accent-violet)] hover:bg-[var(--accent-violet-light)] text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]"
          >
            {showEventForm ? "Cancel Creation" : "+ Create New Event"}
          </button>
        </div>

        {/* Admin Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--surface-card)] p-6 rounded-2xl border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] flex items-center justify-between">
            <div>
              <p className="text-[var(--text-body)] text-sm font-bold uppercase tracking-wider mb-1">
                Total Revenue
              </p>
              <h3 className="text-3xl font-black text-emerald-400">
                ₹
                {bookings.reduce(
                  (sum, b) =>
                    b.paymentStatus === "paid" && b.status === "confirmed"
                      ? sum + b.amount
                      : sum,
                  0,
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center text-xl font-bold">
              ₹
            </div>
          </div>
          <div className="bg-[var(--surface-card)] p-6 rounded-2xl border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] flex items-center justify-between">
            <div>
              <p className="text-[var(--text-body)] text-sm font-bold uppercase tracking-wider mb-1">
                Unique Paying Clients
              </p>
              <h3
                className="text-3xl font-black text-[var(--accent-violet-light)]"
                title="Distinct users with at least one paid, confirmed booking — a repeat customer only counts once."
              >
                {
                  new Set(
                    bookings
                      .filter(
                        (b) =>
                          b.paymentStatus === "paid" &&
                          b.status === "confirmed",
                      )
                      .map((b) => b.userId?._id),
                  ).size
                }
              </h3>
            </div>
            <div className="w-12 h-12 bg-violet-500/15 text-[var(--accent-violet-light)] rounded-full flex items-center justify-center text-xl font-bold">
              👤
            </div>
          </div>
          <div className="bg-[var(--surface-card)] p-6 rounded-2xl border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] flex items-center justify-between">
            <div>
              <p className="text-[var(--text-body)] text-sm font-bold uppercase tracking-wider mb-1">
                Pending Requests
              </p>
              <h3 className="text-3xl font-black text-amber-400">
                {bookings.filter((b) => b.status === "pending").length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center text-xl font-bold">
              ⏳
            </div>
          </div>
        </div>

        {showEventForm && (
          <div className="bg-[var(--surface-card)] p-8 rounded-2xl border border-white/5 shadow-[0_24px_60px_-25px_rgba(0,0,0,0.85)] mb-8 animation-slideDown">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--text-heading)]">
              Create New Event
            </h2>
            <form
              onSubmit={handleCreateEvent}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <input
                required
                type="text"
                placeholder="Event Title"
                className={adminInput}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
              <input
                required
                type="text"
                placeholder="Category (e.g., Tech, Music)"
                className={adminInput}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
              <input
                required
                type="date"
                className={`${adminInput} [color-scheme:dark]`}
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
              <input
                required
                type="text"
                placeholder="Location"
                className={adminInput}
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
              <input
                required
                type="number"
                placeholder="Total Seats"
                className={adminInput}
                value={formData.totalSeats}
                onChange={(e) =>
                  setFormData({ ...formData, totalSeats: e.target.value })
                }
              />
              <input
                required
                type="number"
                placeholder="Ticket Price (0 for free)"
                className={adminInput}
                value={formData.ticketPrice}
                onChange={(e) =>
                  setFormData({ ...formData, ticketPrice: e.target.value })
                }
              />

              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Image URL (Provide any direct link to an image)"
                  className={`${adminInput} w-full`}
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                />
              </div>

              <textarea
                required
                placeholder="Event Description"
                className={`${adminInput} md:col-span-2 h-32`}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
              <button
                type="submit"
                className="md:col-span-2 bg-[var(--accent-violet)] hover:bg-[var(--accent-violet-light)] text-white font-semibold py-3 mt-2 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]"
              >
                Publish Event
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Events Section */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--text-heading)] flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-[var(--text-body)] text-sm">
                {events.length}
              </span>
              All Events
            </h2>
            <div className="bg-[var(--surface-card)] rounded-2xl border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] overflow-hidden">
              <ul className="divide-y divide-white/5 max-h-150 overflow-y-auto">
                {events.length === 0 ? (
                  <li className="p-6 text-[var(--text-body)] text-center">
                    No events created yet.
                  </li>
                ) : (
                  events.map((event) => (
                    <li
                      key={event._id}
                      className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/5 transition border-b border-white/5 last:border-0"
                    >
                      <div>
                        <h4 className="font-semibold text-[var(--text-heading)] mb-1 leading-tight">
                          {event.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-body)]">
                          <span className="flex items-center gap-1 font-medium">
                            <div className="w-2 h-2 rounded-full bg-[var(--accent-violet-light)]"></div>{" "}
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <div
                              className={`w-2 h-2 rounded-full ${event.availableSeats > 0 ? "bg-emerald-500" : "bg-red-500"}`}
                            ></div>{" "}
                            {event.availableSeats}/{event.totalSeats} seats
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="w-full sm:w-auto text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition shrink-0"
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Bookings Section */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--text-heading)] flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold">
                {bookings.length}
              </span>
              Booking Requests
            </h2>
            <div className="bg-[var(--surface-card)] rounded-2xl border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] overflow-hidden">
              <ul className="divide-y divide-white/5 max-h-150 overflow-y-auto">
                {bookings.length === 0 ? (
                  <li className="p-6 text-[var(--text-body)] text-center">
                    No bookings yet.
                  </li>
                ) : (
                  bookings.map((booking) => (
                    <li
                      key={booking._id}
                      className={`p-6 hover:bg-white/5 transition border-l-4 ${booking.status === "pending" ? "border-l-amber-400" : booking.status === "confirmed" ? "border-l-emerald-400" : "border-l-red-400"}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-[var(--text-heading)] text-lg leading-tight">
                          {booking.eventId?.title || "Deleted Event"}
                        </h4>
                        <div className="flex flex-col gap-1 items-end shrink-0 ml-4">
                          <span
                            className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.status === "confirmed" ? "bg-emerald-500/15 text-emerald-300" : booking.status === "cancelled" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}
                          >
                            {booking.status}
                          </span>
                          {booking.status !== "cancelled" && (
                            <span
                              className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.paymentStatus === "paid" ? "bg-violet-500/15 text-violet-300" : "bg-white/10 text-[var(--text-body)]"}`}
                            >
                              {booking.paymentStatus.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/10 text-sm">
                        <p className="text-[var(--text-body)] flex items-center gap-2 mb-1">
                          <span className="font-bold w-16 text-[var(--text-body)] uppercase text-xs">
                            User:
                          </span>
                          <span className="font-semibold text-[var(--text-heading)]">
                            {booking.userId?.name}
                          </span>
                          <span className="text-[var(--text-body)]">
                            ({booking.userId?.email})
                          </span>
                        </p>
                        <p className="text-[var(--text-body)] flex items-center gap-2 mb-1">
                          <span className="font-bold w-16 text-[var(--text-body)] uppercase text-xs">
                            Amount:
                          </span>
                          <span
                            className={`font-semibold ${booking.amount === 0 ? "text-emerald-400" : "text-[var(--text-heading)]"}`}
                          >
                            {booking.amount === 0
                              ? "Free"
                              : `₹${booking.amount}`}
                          </span>
                        </p>
                        <p className="text-[var(--text-body)] flex items-center gap-2 mb-1">
                          <span className="font-bold w-16 text-[var(--text-body)] uppercase text-xs">
                            Date:
                          </span>
                          <span>
                            {new Date(booking.createdAt).toLocaleString()}
                          </span>
                        </p>
                        {booking.eventId && (
                          <p className="text-[var(--text-body)] flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                            <span className="font-bold w-16 text-[var(--text-body)] uppercase text-xs">
                              Seats:
                            </span>
                            <span
                              className={`font-bold ${booking.eventId.availableSeats > 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {booking.eventId.availableSeats}
                            </span>{" "}
                            remaining of {booking.eventId.totalSeats}
                          </p>
                        )}
                      </div>

                      {/* Action buttons for admin */}
                      {booking.status === "pending" && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            onClick={() =>
                              handleConfirmBooking(booking._id, "paid")
                            }
                            className="flex-1 min-w-30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-xs font-bold py-2.5 px-3 rounded-lg transition"
                          >
                            ✓ Approve as Paid
                          </button>
                          <button
                            onClick={() =>
                              handleConfirmBooking(booking._id, "not_paid")
                            }
                            className="flex-1 min-w-30 bg-white/5 text-[var(--text-body)] hover:bg-white/15 hover:text-[var(--text-heading)] border border-white/10 text-xs font-bold py-2.5 px-3 rounded-lg transition"
                          >
                            ✓ Reserve Seat (Unpaid)
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="w-20 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/30 text-xs font-bold py-2.5 px-3 rounded-lg transition"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
