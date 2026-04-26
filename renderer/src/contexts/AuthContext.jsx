import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { getUserProfile, logOut as logOutAuth } from "../utils/authentication";
import supabase from "../utils/supabase";

// Create the context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userDataRef = useRef(null);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    let isMounted = true;

    const syncUserFromSession = async (
      session,
      { showLoader = false, forceProfileRefresh = false } = {}
    ) => {
      if (!isMounted) return;

      try {
        if (showLoader) {
          setLoading(true);
        }

        if (session?.user) {
          const currentUser = userDataRef.current;
          const sameUser =
            currentUser?.id && session.user?.id && currentUser.id === session.user.id;

          if (sameUser && !forceProfileRefresh) {
            localStorage.setItem("isAuthenticated", "true");
            setError(null);
            return;
          }

          const profile = await getUserProfile();
          if (profile) {
            setUserData(profile);
            userDataRef.current = profile;
            localStorage.setItem("isAuthenticated", "true");
          } else {
            setUserData(null);
            userDataRef.current = null;
            localStorage.removeItem("isAuthenticated");
          }
        } else {
          setUserData(null);
          userDataRef.current = null;
          localStorage.removeItem("isAuthenticated");
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message);
        setUserData(null);
        userDataRef.current = null;
        localStorage.removeItem("isAuthenticated");
      } finally {
        if (isMounted && showLoader) setLoading(false);
      }
    };

    const initializeAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error loading auth session:", sessionError);
      }

      await syncUserFromSession(data?.session || null, {
        showLoader: true,
        forceProfileRefresh: true,
      });
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const showLoader = event === "SIGNED_OUT";
      const forceProfileRefresh = event === "SIGNED_IN" || event === "USER_UPDATED";

      void syncUserFromSession(session || null, {
        showLoader,
        forceProfileRefresh,
      });
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
