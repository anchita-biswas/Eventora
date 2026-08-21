import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import EventDetail from "./EventDetail";
import UserDashboard, { ticketPayload } from "./UserDashboard";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/axios";

vi.mock("../utils/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const user = {
  _id: "u1",
  name: "Party Booker",
  email: "party@example.com",
  role: "user",
};

const event = {
  _id: "e1",
  title: "Neon Nights",
  description: "d",
  date: "2026-09-01T00:00:00.000Z",
  location: "Grand Arena",
  category: "Music",
  totalSeats: 100,
  availableSeats: 100,
  ticketPrice: 500,
  image: "",
};

function renderWithUser(ui, { route = "/" } = {}) {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("EventDetail seat picker", () => {
  function renderDetail(overrides = {}) {
    api.get.mockResolvedValueOnce({ data: { ...event, ...overrides } });
    return renderWithUser(
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>,
      { route: "/events/e1" },
    );
  }

  it("offers 1 to 5 seats and prices the whole party", async () => {
    renderDetail();
    const select = await screen.findByLabelText(/how many seats/i);

    expect(select.options).toHaveLength(5);
    expect([...select.options].map((o) => o.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);

    fireEvent.change(select, { target: { value: "3" } });
    expect(screen.getByText("₹1500")).toBeInTheDocument(); // 3 x 500
  });

  it("never offers more seats than the event has left", async () => {
    renderDetail({ availableSeats: 2 });
    const select = await screen.findByLabelText(/how many seats/i);
    expect(select.options).toHaveLength(2);
  });

  it("sends the chosen seat count with the booking", async () => {
    renderDetail();
    const select = await screen.findByLabelText(/how many seats/i);
    fireEvent.change(select, { target: { value: "4" } });

    // Step one asks for the OTP, step two submits the booking.
    api.post.mockResolvedValueOnce({ data: { message: "OTP sent to email" } });
    fireEvent.click(screen.getByRole("button", { name: /request booking/i }));
    const otpField = await screen.findByLabelText(/enter otp/i);

    fireEvent.change(otpField, { target: { value: "123456" } });
    api.post.mockResolvedValueOnce({ data: { message: "Booking created" } });
    fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/bookings", {
        eventId: "e1",
        otp: "123456",
        seats: 4,
      });
    });
  });
});

describe("UserDashboard entry pass", () => {
  const booking = (overrides = {}) => ({
    _id: "b1",
    status: "confirmed",
    paymentStatus: "paid",
    seats: 3,
    amount: 1500,
    createdAt: "2026-08-20T00:00:00.000Z",
    eventId: event,
    ...overrides,
  });

  function renderDashboard(bookings) {
    api.get.mockResolvedValueOnce({ data: bookings });
    return renderWithUser(<UserDashboard />);
  }

  it("renders a QR pass for a confirmed booking", async () => {
    renderDashboard([booking()]);

    expect(
      await screen.findByTitle(/entry pass for neon nights/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/admits 3 . paid/i)).toBeInTheDocument();
  });

  it("encodes the whole payload into a scannable grid", async () => {
    renderDashboard([booking()]);
    const svg = (await screen.findByTitle(/entry pass for/i)).closest("svg");

    // viewBox is "0 0 N N" where N is the QR's module count. If the payload
    // ever outgrew the symbol, qrcode.react would throw instead of render —
    // this pins that it fits, and comfortably below the version-40 ceiling.
    const modules = Number(svg.getAttribute("viewBox").split(" ")[3]);
    expect(modules).toBeGreaterThan(20);
    expect(modules).toBeLessThan(100);
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("withholds the pass until an admin confirms", async () => {
    renderDashboard([booking({ status: "pending", paymentStatus: "not_paid" })]);

    await screen.findByText(/neon nights/i);
    expect(screen.queryByTitle(/entry pass for/i)).not.toBeInTheDocument();
  });

  it("falls back to one seat for bookings made before parties existed", async () => {
    renderDashboard([booking({ seats: undefined, amount: 500 })]);

    await screen.findByTitle(/entry pass for/i);
    expect(screen.getByText(/admits 1 . paid/i)).toBeInTheDocument();
  });

  it("encodes who, what, how many and whether it is paid", () => {
    const payload = JSON.parse(ticketPayload(booking(), user));

    expect(payload).toEqual({
      ticket: "b1",
      name: "Party Booker",
      email: "party@example.com",
      event: "Neon Nights",
      venue: "Grand Arena",
      date: "2026-09-01T00:00:00.000Z",
      pax: 3,
      amount: 1500,
      payment: "paid",
    });
  });
});
