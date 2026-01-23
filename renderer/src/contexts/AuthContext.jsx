import React, { createContext, useContext, useState, useEffect } from "react";
import { getUserProfile, logOut as logOutAuth } from "../utils/authentication";

// Create the context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
        
        if (isAuthenticated) {
          const profile = await getUserProfile();
          setUserData(profile);
        } else {
          setUserData(null);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Logout function that clears context
  const logout = async () => {
    try {
      await logOutAuth();
      setUserData(null);
      localStorage.removeItem("isAuthenticated");
      setError(null);
    } catch (err) {
      console.error("Error during logout:", err);
      setError(err.message);
      throw err;
    }
  };

  // Login function that fetches user data
  const login = async (user) => {
    try {
      const profile = await getUserProfile();
      setUserData(profile);
      setError(null);
    } catch (err) {
      console.error("Error fetching user profile after login:", err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    userData,
    loading,
    error,
    logout,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
