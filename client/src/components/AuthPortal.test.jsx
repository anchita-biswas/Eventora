import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPortal from "./AuthPortal";
import { AuthProvider } from "../context/AuthContext";
import api from "../utils/axios";

vi.mock("../utils/axios", () => ({
  default: { post: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderSignUp() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPortal initialMode="signup" />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// SignUpForm and SignInForm are both always mounted (CSS handles the slide
// animation), each with its own "Full Name"/"Email Address"/"Password"
// fields and a "Sign Up"-labeled button — so queries need to be scoped to
// just the sign-up <form>, not the whole document.
function getSignUpForm() {
  const heading = screen.getByRole("heading", { name: /create an account/i });
  return heading.closest("form");
}

describe("Sign-up flow", () => {
  it("shows the OTP step after registering, instead of redirecting away", async () => {
    api.post.mockResolvedValueOnce({ data: { message: "ok", email: "new@example.com" } });
    renderSignUp();

    const form = within(getSignUpForm());
    fireEvent.change(form.getByLabelText(/full name/i), { target: { value: "New User" } });
    fireEvent.change(form.getByLabelText(/email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(form.getByLabelText(/^password$/i), { target: { value: "abcdefg!" } });
    fireEvent.click(form.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(form.getByLabelText(/verification code/i)).toBeInTheDocument();
    });

    // The bug: register() used to make `user` truthy, which made AuthPortal
    // redirect to /dashboard instead of ever showing this OTP input.
    expect(localStorage.getItem("user")).toBeNull();
    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "New User",
      email: "new@example.com",
      password: "abcdefg!",
    });
  });
});
