import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaChair, FaMoneyBillWave } from 'react-icons/fa';
import Watermark from '../components/Watermark';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                setEvent(data);
            } catch (err) {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setBookingLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (!showOTP) {
                await api.post('/bookings/send-otp');
                setShowOTP(true);
                setSuccessMsg('OTP sent to your email. Please verify to confirm booking.');
            } else {
                await api.post('/bookings', { eventId: event._id, otp });
                setSuccessMsg('Booking requested! Awaiting admin confirmation.');
                setShowOTP(false);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold text-[var(--text-body)]">Loading...</div>;
    if (error && !event) return <div className="text-center py-20 text-xl text-red-400">{error || 'Event not found'}</div>;

    const isSoldOut = event.availableSeats <= 0;

    const infoRow = (icon, label, value) => (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-violet)]/15 flex items-center justify-center text-[var(--accent-violet-light)] shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">{label}</p>
                <div className="font-bold text-[var(--text-heading)] text-lg">{value}</div>
            </div>
        </div>
    );

    return (
        <>
            <Watermark />
            <div className="relative z-10 max-w-4xl mx-auto bg-[var(--surface-card)] rounded-2xl border border-white/5 shadow-[0_28px_70px_-25px_rgba(0,0,0,0.9)] overflow-hidden mt-8">
            {event.image ? (
                <img src={event.image} alt={event.title} className="w-full h-80 object-cover" />
            ) : (
                <div className="w-full h-64 bg-[#1d1d29] flex items-center justify-center text-[var(--text-body)] text-6xl font-black uppercase tracking-widest">
                    {event.category}
                </div>
            )}

            <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                    <div>
                        <div className="inline-block bg-[var(--accent-violet)]/15 text-[var(--accent-violet-light)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                            {event.category}
                        </div>
                        <h1 className="text-4xl font-semibold text-[var(--text-heading)] mb-4">{event.title}</h1>
                        <p className="text-[var(--text-body)] text-lg leading-relaxed mb-6">{event.description}</p>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 w-full md:w-auto md:min-w-75 shrink-0">
                        <h3 className="text-xl font-semibold text-[var(--text-heading)] mb-6">Booking Details</h3>

                        <div className="space-y-4 mb-8">
                            {infoRow(<FaMoneyBillWave />, 'Ticket Price', event.ticketPrice === 0 ? <span className="text-emerald-400">Free</span> : `₹${event.ticketPrice}`)}
                            {infoRow(<FaChair />, 'Availability', <span><span className={event.availableSeats < 10 ? 'text-amber-400' : ''}>{event.availableSeats}</span> / {event.totalSeats}</span>)}
                            {infoRow(<FaCalendarAlt />, 'Date', new Date(event.date).toLocaleDateString())}
                            {infoRow(<FaMapMarkerAlt />, 'Location', event.location)}
                        </div>

                        {event.ticketPrice > 0 && (
                            <p className="mb-4 text-xs text-[var(--text-body)] bg-white/5 border border-white/10 rounded-lg p-3">
                                There's no online payment yet — after the organizer approves your request, you'll arrange payment with them directly and your ticket is marked paid once received.
                            </p>
                        )}

                        {showOTP && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[var(--text-heading)]/80 mb-2">Enter OTP to Confirm</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="6-digit code"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-heading)] placeholder-[var(--text-body)] focus:outline-none focus:border-[var(--accent-violet)] focus:ring-2 focus:ring-[var(--accent-violet)]/30 transition font-bold tracking-widest text-center text-lg"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength="6"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleBooking}
                            disabled={isSoldOut || bookingLoading || (showOTP && !otp) || (successMsg && !showOTP)}
                            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${isSoldOut || (successMsg && !showOTP)
                                ? 'bg-white/10 text-[var(--text-body)] cursor-not-allowed'
                                : 'bg-[var(--accent-violet)] hover:bg-[var(--accent-violet-light)] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:-translate-y-0.5'
                                }`}
                        >
                            {bookingLoading ? 'Processing...' : (showOTP ? 'Verify OTP & Confirm' : (successMsg && !showOTP ? 'Request Sent' : (isSoldOut ? 'Sold Out' : 'Request Booking')))}
                        </button>
                        {error && <p className="text-red-300 mt-4 text-center font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}
                        {successMsg && <p className="text-emerald-300 mt-4 text-center font-medium bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">{successMsg}</p>}
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};

export default EventDetail;
