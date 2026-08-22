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

/*
 * A stale sign-in looks exactly like a live one from the UI's side: the user
 * profile sits in localStorage and the navbar renders as signed in, while the
 * session cookie behind it is gone (expired, cleared, or created before this
 * app moved off Authorization headers). Every protected call then comes back
 * "Not authorized, no token" and the only way out was to log out by hand.
 *
 * So the 401 clears the stale profile and sends them to sign in again. Doing
 * it here rather than in each caller means it covers every protected route —
 * booking, dashboards, admin — not just whichever one was clicked first.
 */
export const handleAuthError = (error) => {
    const url = error.config?.url || '';
    // /auth/* answers 401 as part of its normal job; only a protected call
    // coming back 401 means the session itself is gone.
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
            window.location.assign('/login');
        }
    }
    return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleAuthError);

export default api;
