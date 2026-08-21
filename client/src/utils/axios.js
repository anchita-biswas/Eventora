import axios from "axios";

const api = axios.create({
  // Relative by default: the server serves this bundle, so the API is always
  // same-origin. An absolute fallback would bake a hostname into the build and
  // break every deploy that isn't the machine it was built on.
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

export default api;
