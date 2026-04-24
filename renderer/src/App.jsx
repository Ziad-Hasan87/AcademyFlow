import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { userData, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Redirect if already logged in
function PublicRoute({ children }) {
  const { userData, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (userData) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppStartupGate() {
  const { userData, loading } = useAuth();
  const location = useLocation();
  const signaledRef = useRef(false);

  useEffect(() => {
    if (signaledRef.current) return;
    if (loading) return;

    const targetPath = userData ? "/dashboard" : "/login";
    if (location.pathname !== targetPath) return;

    if (window?.electronAPI?.markAppReady) {
      window.electronAPI.markAppReady();
      signaledRef.current = true;
    }
  }, [loading, userData, location.pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppStartupGate />
        <Routes>
          {/* Login route: redirect logged-in users */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
