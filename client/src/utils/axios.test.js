import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAuthError } from "./axios";

const assign = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("user", JSON.stringify({ name: "Stale" }));
  vi.clearAllMocks();
  // jsdom's real location.assign is not implemented and would log an error.
  vi.stubGlobal("location", { pathname: "/dashboard", assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const failure = (status, url) =>
  handleAuthError({ config: { url }, response: { status } }).catch((e) => e);

describe("handleAuthError", () => {
  it("clears the stale profile and redirects when a protected call 401s", async () => {
    await failure(401, "/bookings");

    expect(localStorage.getItem("user")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("leaves the session alone when an auth endpoint 401s", async () => {
    await failure(401, "/auth/login");

    expect(localStorage.getItem("user")).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("ignores failures that are not 401s", async () => {
    await failure(500, "/bookings");

    expect(localStorage.getItem("user")).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not bounce a user who is already on the login page", async () => {
    vi.stubGlobal("location", { pathname: "/login", assign });

    await failure(401, "/bookings/my");

    expect(localStorage.getItem("user")).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("still rejects, so callers can show their own error", async () => {
    const error = await failure(401, "/bookings");
    expect(error.response.status).toBe(401);
  });
});
