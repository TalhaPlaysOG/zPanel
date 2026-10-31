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
  Server, User, Lock, Eye, EyeOff, Terminal, Folder, Shield, Database,
  RefreshCw, Play, Users, Cloud, Globe, Zap, Layers, Monitor, Wifi, Code2,
  Save, Puzzle, Box, Map, SlidersHorizontal, Sparkles, FastForward, Feather,
  AlertCircle
} from "lucide-react";
import "./Login.css";

const SHOWCASE_CARDS = [
  { id: "paper", label: "Paper", desc: "High Performance", icon: Zap, gradient: "from-zp-primary-500 via-zp-primary-600 to-zp-primary-800" },
  { id: "purpur", label: "Purpur", desc: "Paper + Extra Features", icon: Sparkles, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-700" },
  { id: "vanilla", label: "Vanilla", desc: "Official Minecraft", icon: Server, gradient: "from-zp-text-secondary via-zp-text-muted to-zp-text-dim" },
  { id: "spigot", label: "Spigot", desc: "Classic Plugins", icon: Wrench, gradient: "from-zp-warning-500 via-zp-warning-600 to-zp-warning-700" },
  { id: "fabric", label: "Fabric", desc: "Lightweight Mods", icon: Feather, gradient: "from-zp-success-500 via-zp-success-600 to-zp-success-700" },
  { id: "forge", label: "Forge", desc: "Classic Modpack", icon: Wrench, gradient: "from-zp-danger-500 via-zp-danger-600 to-zp-danger-700" },
  { id: "bungeecord", label: "BungeeCord", desc: "Classic Proxy", icon: Network, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-700" },
  { id: "velocity", label: "Velocity", desc: "Next-gen Proxy", icon: FastForward, gradient: "from-zp-primary-500 via-zp-primary-600 to-zp-primary-800" },
  { id: "live-console", label: "Live Console", desc: "Real-time streaming", icon: Terminal, gradient: "from-zp-primary-400 via-zp-primary-500 to-zp-primary-600" },
  { id: "file-manager", label: "File Manager", desc: "Edit, upload, organize", icon: Folder, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-600" },
  { id: "sftp", label: "SFTP Access", desc: "Secure file transfer", icon: Shield, gradient: "from-zp-success-400 via-zp-success-500 to-zp-success-600" },
  { id: "backups", label: "Backups", desc: "Protect your worlds", icon: Database, gradient: "from-zp-warning-400 via-zp-warning-500 to-zp-warning-600" },
  { id: "sub-users", label: "Sub-Users", desc: "Share server access", icon: Users, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-600" },
  { id: "players", label: "Player Manager", desc: "Manage your community", icon: Users, gradient: "from-zp-primary-400 via-zp-primary-500 to-zp-primary-600" },
  { id: "plugins", label: "Plugins", desc: "Extend functionality", icon: Puzzle, gradient: "from-zp-success-400 via-zp-success-500 to-zp-success-600" },
  { id: "mods", label: "Mods", desc: "Install modpacks", icon: Box, gradient: "from-zp-warning-400 via-zp-warning-500 to-zp-warning-600" },
  { id: "world-manager", label: "World Manager", desc: "Control your maps", icon: Map, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-600" },
  { id: "server-properties", label: "Server Properties", desc: "Configure settings", icon: SlidersHorizontal, gradient: "from-zp-primary-400 via-zp-primary-500 to-zp-primary-600" },
  { id: "playit", label: "Playit.gg Tunnel", desc: "Expose your server", icon: Globe, gradient: "from-zp-warning-400 via-zp-warning-500 to-zp-warning-600" },
  { id: "cloudflare", label: "Cloudflare Tunnel", desc: "Secure remote access", icon: Cloud, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-600" },
  { id: "docker-local", label: "Docker & Local", desc: "Flexible runtimes", icon: Layers, gradient: "from-zp-success-400 via-zp-success-500 to-zp-success-600" },
  { id: "java-runtime", label: "Java Runtime", desc: "Java 17/21/25", icon: Monitor, gradient: "from-zp-primary-400 via-zp-primary-500 to-zp-primary-600" },
  { id: "nodes", label: "Nodes", desc: "Multi-node hosting", icon: Wifi, gradient: "from-zp-info-400 via-zp-info-500 to-zp-info-600" },
  { id: "api-keys", label: "API Keys", desc: "Programmatic access", icon: Code2, gradient: "from-zp-primary-400 via-zp-primary-500 to-zp-primary-600" },
];

const ShowcaseCard = ({ card }: { card: (typeof SHOWCASE_CARDS)[number] }) => {
  const Icon = card.icon;
  return (
    <div className="nb-login-showcase-card">
      <div className="nb-login-showcase-card-tile" style={{ background: card.gradient }}>
        <Icon className="nb-login-showcase-card-icon" />
      </div>
      <div className="nb-login-showcase-card-body">
        <span className="nb-login-showcase-card-name">{card.label}</span>
        <span className="nb-login-showcase-card-desc">{card.desc}</span>
      </div>
    </div>
  );
};

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
      {animationEnabled && (
        <div className="nb-login-showcase">
          <div className="nb-login-showcase-bg">
            <div className="nb-login-glow nb-login-glow-1" />
            <div className="nb-login-glow nb-login-glow-2" />
            <div className="nb-login-glow nb-login-glow-3" />
          </div>

          <div className="nb-login-showcase-text">
            <h2 className="nb-login-showcase-headline">Your Minecraft servers. One panel.</h2>
            <p className="nb-login-showcase-subhead">
              Live console, file manager, backups and player management, wrapped in an interface built for speed.
            </p>
          </div>

          <div className="nb-login-showcase-mask">
            <div className="nb-login-showcase-grid">
              <div className="nb-login-showcase-col nb-login-scroll-up">
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 0).map(card => (
                  <ShowcaseCard key={card.id} card={card} />
                ))}
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 0).map(card => (
                  <ShowcaseCard key={`dup-${card.id}`} card={card} />
                ))}
              </div>
              <div className="nb-login-showcase-col nb-login-scroll-down">
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 1).map(card => (
                  <ShowcaseCard key={card.id} card={card} />
                ))}
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 1).map(card => (
                  <ShowcaseCard key={`dup-${card.id}`} card={card} />
                ))}
              </div>
              <div className="nb-login-showcase-col nb-login-scroll-up">
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 2).map(card => (
                  <ShowcaseCard key={card.id} card={card} />
                ))}
                {SHOWCASE_CARDS.filter((_, i) => i % 3 === 2).map(card => (
                  <ShowcaseCard key={`dup-${card.id}`} card={card} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="nb-login-main">
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

        {error && <div className="nb-login-error" role="alert" aria-live="polite">{error}</div>}

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
      </main>

      {isLoading && <LoadingOverlay message="Authenticating…" />}
    </div>
  );
}
