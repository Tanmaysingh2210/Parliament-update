import "./Auth.css";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !confirm) {
      setError("Please fill all fields");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await signup(email, password);
    setLoading(false);
    if (!res.success) setError(res.error || "Signup failed");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create an account</h2>

        <form onSubmit={onSubmit} className="auth-form">
          <input
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="username"
          />

          <input
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="new-password"
          />

          <input
            className="auth-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            type="password"
            autoComplete="new-password"
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-link" onClick={() => navigate('/login')}>Already have an account?</button>
        </div>
      </div>
    </div>
  );
}
