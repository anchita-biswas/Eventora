import React, { createContext, useState } from "react";
import api from "../utils/axios";

export const AuthContext = createContext();

// Read the persisted user once, synchronously, before the first render.
const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Initialising from localStorage synchronously means a page reload never
  // renders a brief "logged out" frame — which was what bounced protected
  // pages (dashboard/admin) to /login even while the user was still signed in.
  const [user, setUser] = useState(getStoredUser);

  const register = async (name, email, password) => {
    try {
      // Registration only returns {message, email} — no token/role yet, since
      // the account isn't verified. Don't setUser here: doing so made `user`
      // truthy before OTP verification, which sent AuthPortal's `if (user)`
      // redirect straight past the OTP screen for every new sign-up.
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
      });
      return data;
    } catch (err) {
      console.error("Registration failed: ", err);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("token", data.token);
      return data;
    } catch (err) {
      console.error("Login failed: ", err);
      throw err;
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("token", data.token);
      return data;
    } catch (err) {
      console.error("OTP verification failed: ", err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading: false, login, logout, verifyOTP, register }}
    >
      {children}
    </AuthContext.Provider>
  );
};
