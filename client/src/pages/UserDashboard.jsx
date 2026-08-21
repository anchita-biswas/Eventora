import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaTimesCircle, FaQrcode } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import Watermark from '../components/Watermark';

/*
 * What the ticket QR carries: who is coming, what they're coming to, how many
 * of them, and whether it's paid for — the four things someone on the door
 * needs. The booking id leads the payload so a scanner can look the booking
 * up rather than trust the rest of it.
 *
 * ponytail: unsigned payload, so this proves nothing on its own — anyone can
 * generate a QR that says "paid". Fine while the door checks bookings against
 * the API by id; sign it (HMAC over the payload, verified server-side) the
 * moment a scanner is expected to accept a ticket offline.
 */
export const ticketPayload = (booking, user) =>
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

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchBookings();
    }, [user, navigate]);

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/my');
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings', error);
        } finally {
            setLoading(false);
        }
    };

    const cancelBooking = async (id) => {
        if (window.confirm('Are you sure you want to cancel this booking request?')) {
            try {
                await api.delete(`/bookings/${id}`);
                fetchBookings();
            } catch (error) {
                alert(error.response?.data?.error || 'Error cancelling booking');
            }
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold text-[var(--text-body)]">Loading dashboard...</div>;

    return (
        <>
            <Watermark />
            <div className="relative z-10 max-w-6xl mx-auto">
            <div className="bg-[var(--surface-card)] rounded-2xl border border-white/5 shadow-[0_24px_60px_-25px_rgba(0,0,0,0.85)] p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
                <div className="w-20 h-20 bg-[var(--accent-violet)]/15 text-[var(--accent-violet-light)] rounded-full flex items-center justify-center text-3xl font-bold uppercase tracking-widest shrink-0">
                    {user?.name.charAt(0)}
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-heading)] mb-2">Welcome, {user?.name}!</h1>
                    <p className="text-[var(--text-body)] flex items-center justify-center sm:justify-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> User Dashboard
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-heading)] flex items-center gap-2 sm:gap-3">
                    <FaTicketAlt className="text-[var(--accent-violet-light)]" /> My Bookings requests
                </h2>
            </div>

            {bookings.length === 0 ? (
                <div className="bg-[var(--surface-card)] rounded-2xl border border-white/5 p-12 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTicketAlt className="text-[var(--text-body)] text-3xl" />
                    </div>
                    <p className="text-xl text-[var(--text-body)] mb-6 mt-4 font-medium">You haven't booked any events yet.</p>
                    <Link to="/" className="inline-block bg-[var(--accent-violet)] hover:bg-[var(--accent-violet-light)] text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_28px_rgba(124,58,237,0.55)]">
                        Browse Events
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="bg-[var(--surface-card)] rounded-2xl overflow-hidden border border-white/5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition-transform flex flex-col">
                            <div className="p-6 border-b border-white/5 grow">
                                {booking.eventId ? (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-semibold text-[var(--text-heading)] leading-tight">{booking.eventId.title}</h3>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-300' :
                                                    booking.status === 'cancelled' ? 'bg-red-500/15 text-red-300' :
                                                        'bg-amber-500/15 text-amber-300'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                                {booking.status !== 'cancelled' && (
                                                    <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.paymentStatus === 'paid' ? 'bg-violet-500/15 text-violet-300' : 'bg-white/10 text-[var(--text-body)]'
                                                        }`}>
                                                        {booking.paymentStatus.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-[var(--text-body)] mb-4 space-y-1">
                                            <p><strong className="text-[var(--text-heading)]/80 font-semibold">Date:</strong> {new Date(booking.eventId.date).toLocaleDateString()}</p>
                                            <p><strong className="text-[var(--text-heading)]/80 font-semibold">Seats:</strong> {booking.seats || 1}</p>
                                            <p><strong className="text-[var(--text-heading)]/80 font-semibold">Amount:</strong> {booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</p>
                                            <p><strong className="text-[var(--text-heading)]/80 font-semibold">Requested:</strong> {new Date(booking.createdAt).toLocaleDateString()}</p>
                                        </div>

                                        {booking.status === 'confirmed' && (
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                                <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                                                    <FaQrcode /> Entry Pass
                                                </p>
                                                {/* QR needs a light quiet zone to scan reliably, so it keeps
                                                    its own white card rather than sitting on the dark surface. */}
                                                <div className="mx-auto w-fit rounded-lg bg-white p-3">
                                                    <QRCodeSVG
                                                        value={ticketPayload(booking, user)}
                                                        size={140}
                                                        level="M"
                                                        title={`Entry pass for ${booking.eventId.title}`}
                                                    />
                                                </div>
                                                <p className="mt-3 text-center text-xs text-[var(--text-body)]">
                                                    Admits {booking.seats || 1} · {booking.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-red-400 italic">Event details unavailable (might have been deleted)</p>
                                )}
                            </div>
                            <div className="p-4 bg-white/5 flex flex-wrap justify-between items-center gap-2 shrink-0">
                                {booking.eventId && booking.status !== 'cancelled' ? (
                                    <>
                                        <Link to={`/events/${booking.eventId._id}`} className="text-[var(--accent-violet-light)] font-semibold text-sm hover:underline">View Event</Link>
                                        {booking.status === 'confirmed' && (
                                            <button
                                                onClick={() => navigate(
                                                    booking.paymentStatus === 'paid' ? '/payment-success' : '/payment-failed',
                                                    { state: { eventTitle: booking.eventId.title, amount: booking.amount } }
                                                )}
                                                className="text-emerald-400 font-semibold text-sm hover:underline"
                                            >
                                                View Confirmation
                                            </button>
                                        )}
                                        <button
                                            onClick={() => cancelBooking(booking._id)}
                                            className="text-red-400 font-semibold text-sm hover:text-red-300 transition flex items-center gap-1"
                                        >
                                            <FaTimesCircle /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full text-center text-sm text-[var(--text-body)] italic">Booking Cancelled</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </>
    );
};

export default UserDashboard;
