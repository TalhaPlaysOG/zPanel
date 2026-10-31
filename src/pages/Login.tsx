// @ts-nocheck
import React, { useState, useEffect } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  Server, User, Lock, Eye, EyeOff,
} from "lucide-react";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameTried, setUsernameTried] = useState(false);
  const [passwordTried, setPasswordTried] = useState(false);

  const { login } = useAuth();
  const {
    panelName, panelLogo, enableRegistration,
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId,
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId,
    enableLoginAnimation,
  } = useSettings();
  const navigate = useNavigate();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const animationEnabled = enableLoginAnimation !== false && !reduceMotion;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setUsernameTried(true);
    setPasswordTried(true);

    if (!username.trim()) {
      setError("A username must be provided.");
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("A password must be provided.");
      setIsLoading(false);
      return;
    }

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
      {/* Ambient background glows */}
      <div className="nb-login-bg-glows" />

      {/* Showcase wall (desktop only) */}
      {animationEnabled && (
        <div className="nb-login-showcase">
          <div className="nb-login-showcase-text">
            <h2 className="nb-login-showcase-headline">Your Minecraft servers. One panel.</h2>
            <p className="nb-login-showcase-subhead">
              Live console, file manager, backups and player management, wrapped in an interface built for speed.
            </p>
          </div>
        </div>
      )}

      {/* Centered login card */}
      <main className="nb-login-main">
        <div className="nb-login-card">
          {/* Brand */}
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
              <p className="nb-login-subtitle">Access your servers, console and files.</p>
            </div>
          </div>

          {/* Error box */}
          {error && <div className="nb-login-error" role="alert" aria-live="polite">{error}</div>}

          {/* Form */}
          <form onSubmit={handleLogin} autoComplete="off" noValidate>
            <div className="nb-login-input-wrap">
              <label htmlFor="username" className="nb-login-label">Username</label>
              <div className="nb-login-input-field">
                <User className="nb-login-input-icon" />
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  className="nb-login-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  onBlur={() => setUsernameTried(true)}
                />
              </div>
              {usernameTried && !username.trim() && (
                <span className="nb-login-field-error">A username must be provided.</span>
              )}
            </div>

            <div className="nb-login-input-wrap">
              <label htmlFor="password" className="nb-login-label">Password</label>
              <div className="nb-login-input-field">
                <Lock className="nb-login-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="nb-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onBlur={() => setPasswordTried(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="nb-login-password-toggle"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordTried && !password.trim() && (
                <span className="nb-login-field-error">A password must be provided.</span>
              )}
            </div>

            <button type="submit" className="nb-login-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="nb-login-btn-spinner" />
                  Authenticating…
                </>
              ) : "Sign In"}
            </button>
          </form>

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
                className="nb-login-google-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="nb-login-google-icon">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z" />
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {enableRegistration !== false && (
            <div className="nb-login-footer">
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </div>
          )}
        </div>
      </main>

      {isLoading && <LoadingOverlay message="Authenticating…" />}
    </div>
  );
}
