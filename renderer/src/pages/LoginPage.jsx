import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logIn } from "../utils/authentication";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import "../App.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      // 1️⃣ Authenticate user
      const user = await logIn(email, password);

      // 2️⃣ Fetch user profile from public.users along with institute name
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select(`
          id,
          role,
          institute_id,
          name,
          institutes!inner(name)  -- join with institutes table
        `)
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // 3️⃣ Store auth in browser storage & update context
      localStorage.setItem("isAuthenticated", "true");
      
      // Update auth context with user data
      await login();

      // 4️⃣ Redirect
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed");
    }
  };


  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">AcademyFlow</h1>
          <p className="login-subtitle">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
