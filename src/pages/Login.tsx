// @ts-nocheck
import React, { useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Server, User, Lock } from "lucide-react";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const {
    panelName, panelLogo, enableRegistration,
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId,
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId,
  } = useSettings();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!firebaseApiKey || !firebaseProjectId) {
      setError("Firebase Google Login is not configured by the administrator.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const fbConfig = {
        apiKey: firebaseApiKey,
        authDomain: firebaseAuthDomain,
        projectId: firebaseProjectId,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        appId: firebaseAppId,
      };
      const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      if (!googleUser.email) throw new Error("No email associated with this Google account");
      const res = await axios.post("/api/auth/google", {
        email: googleUser.email,
        googleId: googleUser.uid,
        name: googleUser.displayName || "",
        photoURL: googleUser.photoURL || "",
      });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("Google Login popup was closed before completing.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase Console → Auth settings → Authorized Domains.");
      } else if (err.code === "auth/too-many-requests" || err.response?.status === 429) {
        setError("Too many login requests. Please wait a minute and try again.");
      } else {
        setError(err.response?.data?.error || err.message || "Google Authentication failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nb-login-wrapper">
      {/* Animated background grid */}
      <div className="nb-login-grid" />

      {/* Floating orbs */}
      <div className="nb-login-orb nb-login-orb-1" />
      <div className="nb-login-orb nb-login-orb-2" />

      {/* Auth Card */}
      <div className="nb-login-card">
        {/* Logo + Panel name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.75rem" }}>
          {panelLogo ? (
            <img
              src={panelLogo}
              alt="Logo"
              style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "contain" }}
            />
          ) : (
            <div className="nb-login-logo">
              <Server size={20} color="#a78bfa" />
            </div>
          )}
          <div>
            <h1 className="nb-login-title">{panelName || "zPanel"}</h1>
            <p className="nb-login-subtitle">Sign in to continue</p>
          </div>
        </div>

        {/* Error */}
        {error && <div className="nb-login-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleLogin} autoComplete="off">
          <div className="nb-login-input-wrap">
            <label className="nb-login-label">Username</label>
            <div style={{ position: "relative" }}>
              <User className="nb-login-input-icon" />
              <input
                type="text"
                name="username"
                required
                placeholder="Enter your username"
                className="nb-login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="nb-login-input-wrap">
            <label className="nb-login-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock className="nb-login-input-icon" />
              <input
                type="password"
                name="password"
                required
                placeholder="Enter your password"
                className="nb-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="nb-login-btn" disabled={isLoading}>
            {isLoading ? "Authenticating…" : "Sign In"}
          </button>
        </form>

        {/* Google Sign-In */}
        {enableGoogleLogin && (
          <>
            <div className="nb-login-divider">
              <span className="nb-login-divider-line" />
              <span className="nb-login-divider-text">or</span>
              <span className="nb-login-divider-line" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                background: "rgba(6, 9, 26, 0.6)",
                color: "#94a3b8",
                fontWeight: 600,
                fontSize: "0.875rem",
                fontFamily: '"Inter", sans-serif',
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.625rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.4)";
                (e.currentTarget as HTMLButtonElement).style.color = "#f0f4ff";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.2)";
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,9,26,0.6)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {/* Register link */}
        {enableRegistration !== false && (
          <div className="nb-login-footer">
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </div>
        )}
      </div>

      {isLoading && <LoadingOverlay message="Authenticating…" />}
    </div>
  );
}
