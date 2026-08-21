import axios from "axios";

const api = axios.create({
  // Relative by default: the server serves this bundle, so the API is always
  // same-origin. An absolute fallback would bake a hostname into the build and
  // break every deploy that isn't the machine it was built on.
  baseURL: import.meta.env.VITE_API_URL || "/api",
  // The session token is an httpOnly cookie the server sets at login, so it
  // travels automatically and no script here can read it. Nothing attaches an
  // Authorization header any more — there is no token in localStorage to steal.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
