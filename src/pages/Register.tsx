// @ts-nocheck
import React, { useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, Link } from "react-router-dom";
import { Server, ArrowRight, Lock, User, CheckCircle } from "lucide-react";
import axios from "axios";
import "./Login.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { panelName, panelLogo, enableRegistration } = useSettings();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (enableRegistration === false) {
      setError("User registration is currently disabled by administrator.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/api/auth/register", { username, password, confirmPassword });
      setSuccess("Account created successfully! Redirecting to sign in...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nb-login-wrapper">
      {/* Registration Card — centered, no showcase wall */}
      <div className="nb-login-card-register">
        <div className="nb-login-brand">
          {panelLogo ? (
            <img src={panelLogo} alt="Logo" className="nb-login-logo-img" />
          ) : (
            <div className="nb-login-logo">
              <Server size={20} className="nb-login-logo-icon" />
            </div>
          )}
          <div>
            <h1 className="nb-login-title">{panelName || "zPanel"}</h1>
            <p className="nb-login-subtitle">Create your account</p>
          </div>
        </div>

        {enableRegistration === false && (
          <div className="nb-login-error" style={{ background: "rgba(237, 98, 111, 0.1)", borderColor: "rgba(237, 98, 111, 0.25)", color: "var(--zp-danger)" }}>
            User registration is currently disabled by administrator.
          </div>
        )}

        {error && <div className="nb-login-error">{error}</div>}

        {success && (
          <div className="nb-login-success">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister} autoComplete="off" noValidate>
          <div className="nb-login-input-wrap">
            <label className="nb-login-label">Username</label>
            <div className="nb-login-input-field">
              <User className="nb-login-input-icon" />
              <input
                type="text"
                name="username"
                required
                placeholder="Choose a username"
                className="nb-login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="nb-login-input-wrap">
            <label className="nb-login-label">Password</label>
            <div className="nb-login-input-field">
              <Lock className="nb-login-input-icon" />
              <input
                type="password"
                name="password"
                required
                placeholder="At least 6 characters"
                className="nb-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="nb-login-input-wrap">
            <label className="nb-login-label">Confirm Password</label>
            <div className="nb-login-input-field">
              <Lock className="nb-login-input-icon" />
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="Repeat your password"
                className="nb-login-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="nb-login-btn"
            disabled={isLoading || !!success || enableRegistration === false}
          >
            {isLoading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="nb-login-footer">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </div>
      </div>

      {isLoading && <LoadingOverlay message="Processing…" />}
    </div>
  );
}
