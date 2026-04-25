import "./Auth.css";
import "./EntryPage.css";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { signin, handleGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loding, setLoding] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    const res = await signin(email, password);
    setLoading(false);
    if (!res.success) setError(res.error || "Signin failed");
  };

  return (

<>
    {loding && (
                <div className="entry-loading">
                    <div className="entry-spinner"></div>
                    <p>Entering Battlefield...</p>
                </div>
            )}
    <div className="auth-container">

      <div className="auth-card">
        <h2 className="auth-title">Sign in to Parliament</h2>

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
            autoComplete="current-password"
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-link" onClick={() => navigate('/signup')}>Create account</button>
          <button className="auth-guest" disabled={loding}
            onClick={async () => {
              setLoding(true);

              // 🔥 allow UI to update
              await new Promise(res => setTimeout(res, 50));

              await handleGuest();
            }}>{loding ? "Entering..." : "Continue as Guest"}</button>
        </div>
      </div>
    </div>
</>
  );
}
