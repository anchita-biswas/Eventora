import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContext } from "react";
import { AuthContext, AuthProvider } from "./AuthContext";
import api from "../utils/axios";

vi.mock("../utils/axios", () => ({
  default: { post: vi.fn() },
}));

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AuthContext.register", () => {
  it("does not log the user in — register() only returns {message, email}, no token/role", async () => {
    api.post.mockResolvedValueOnce({ data: { message: "ok", email: "a@b.com" } });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current.register("Name", "a@b.com", "pw");
    });

    // This is the regression test for the sign-up redirect bug: setting
    // `user` here made AuthPortal's `if (user) <Navigate />` fire before
    // the OTP screen ever rendered.
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("AuthContext.verifyOTP", () => {
  it("logs the user in and persists the session once OTP is verified", async () => {
    api.post.mockResolvedValueOnce({
      data: { _id: "1", name: "Name", email: "a@b.com", role: "user", token: "jwt-token" },
    });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current.verifyOTP("a@b.com", "123456");
    });

    expect(result.current.user.email).toBe("a@b.com");
    // The session is an httpOnly cookie now, so the token must never be
    // written anywhere script on the page can read it.
    expect(localStorage.getItem("token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("user")).token).toBeUndefined();
  });
});

describe("AuthContext.logout", () => {
  it("clears the user and localStorage", async () => {
    api.post.mockResolvedValueOnce({
      data: { _id: "1", name: "Name", email: "a@b.com", role: "user", token: "jwt-token" },
    });
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current.login("a@b.com", "pw");
    });
    expect(result.current.user).toBeTruthy();

    api.post.mockResolvedValueOnce({ data: { message: "Logged out" } });
    await act(async () => {
      await result.current.logout();
    });

    // Only the server can expire the cookie, so logout has to call it.
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
