import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FaHourglassHalf } from 'react-icons/fa';

// Only reached from a *confirmed* booking whose paymentStatus is still
// "not_paid" (UserDashboard.jsx) — the seat is reserved, nothing failed.
// Since there's no payment gateway yet, this just tells the user their
// payment hasn't been marked received, instead of falsely saying the
// booking failed.
const PaymentFailed = () => {
    const { state } = useLocation();
    // Only meaningful when arrived at from a real booking in the dashboard,
    // which passes the event through router state. Opened directly by URL
    // there is no booking to report on, so send the visitor to their tickets.
    if (!state) return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
            <div className="bg-[var(--surface-card)] p-10 rounded-3xl shadow-[0_28px_70px_-25px_rgba(0,0,0,0.9)] max-w-md w-full text-center border-t-8 border-amber-500 border-x border-b border-white/5 transform transition-all hover:-translate-y-1">
                <FaHourglassHalf className="text-amber-400 text-7xl mx-auto mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                <h1 className="text-4xl font-semibold text-[var(--text-heading)] mb-4">Payment Pending</h1>
                <p className="text-[var(--text-body)] mb-8 text-lg">
                    Your seat {state?.eventTitle ? <>for <strong>{state.eventTitle}</strong></> : 'for this booking'} is reserved, but payment hasn't been marked as received yet. Arrange payment with the organizer directly to complete it.
                </p>
                <div className="space-y-4">
                    <Link to="/" className="block w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_22px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                        Return to Events
                    </Link>
                    <Link to="/dashboard" className="block w-full bg-white/5 hover:bg-white/10 text-[var(--text-heading)] border border-white/10 font-bold py-4 px-6 rounded-xl transition">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailed;
