import React, { createContext, useContext, useState, useEffect } from "react";
import { getUserProfile, logOut as logOutAuth } from "../utils/authentication";
import supabase from "../utils/supabase";

// Create the context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const syncUserFromSession = async (session) => {
      if (!isMounted) return;

      try {
        setLoading(true);

        if (session?.user) {
          const profile = await getUserProfile();
          if (profile) {
            setUserData(profile);
            localStorage.setItem("isAuthenticated", "true");
          } else {
            setUserData(null);
            localStorage.removeItem("isAuthenticated");
          }
        } else {
          setUserData(null);
          localStorage.removeItem("isAuthenticated");
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message);
        setUserData(null);
        localStorage.removeItem("isAuthenticated");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const initializeAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error loading auth session:", sessionError);
      }

      await syncUserFromSession(data?.session || null);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserFromSession(session || null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
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
