import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

const PaymentSuccess = () => {
    const { state } = useLocation();
    // Only meaningful when arrived at from a real booking in the dashboard,
    // which passes the event through router state. Opened directly by URL
    // there is no booking to report on, so send the visitor to their tickets.
    if (!state) return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
            <div className="bg-[var(--surface-card)] p-10 rounded-3xl shadow-[0_28px_70px_-25px_rgba(0,0,0,0.9)] max-w-md w-full text-center border-t-8 border-emerald-500 border-x border-b border-white/5 transform transition-all hover:-translate-y-1">
                <FaCheckCircle className="text-emerald-400 text-7xl mx-auto mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                <h1 className="text-4xl font-semibold text-[var(--text-heading)] mb-4">Booking Confirmed!</h1>
                <p className="text-[var(--text-body)] mb-8 text-lg">
                    Your ticket for {state?.eventTitle ? <strong>{state.eventTitle}</strong> : 'your event'} has been booked successfully. A confirmation email has been sent to your registered email address.
                </p>
                <div className="space-y-4">
                    <Link to="/dashboard" className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_22px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]">
                        View My Tickets
                    </Link>
                    <Link to="/" className="block w-full bg-white/5 hover:bg-white/10 text-[var(--text-heading)] border border-white/10 font-bold py-4 px-6 rounded-xl transition">
                        Discover More Events
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
