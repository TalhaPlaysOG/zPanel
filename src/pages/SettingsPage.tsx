// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Settings, Shield, User, Key, Check, AlertCircle, Save, Cpu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const {
    panelName,
    enablePlayit,
    enableRegistration,
    defaultRuntime,
    fetchSettings,
  } = useSettings();

  const [name, setName] = useState(panelName || "zPanel");
  const [allowRegistration, setAllowRegistration] = useState(enableRegistration !== false);
  const [playitActive, setPlayitActive] = useState(enablePlayit || false);
  const [runtime, setRuntime] = useState(defaultRuntime || "docker");

  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setName(panelName || "zPanel");
    setAllowRegistration(enableRegistration !== false);
    setPlayitActive(enablePlayit || false);
    setRuntime(defaultRuntime || "docker");
  }, [panelName, enableRegistration, enablePlayit, defaultRuntime]);

  useEffect(() => {
    if (user?.username) {
      setNewUsername(user.username);
    }
  }, [user?.username]);

  const handleSavePanelSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    try {
      await axios.put("/api/system/settings", {
        panelName: name.trim() || "zPanel",
        enableRegistration: allowRegistration,
        enablePlayit: playitActive,
        defaultRuntime: runtime,
      });
      await fetchSettings();
      setSettingsMsg({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setSettingsMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update settings.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setProfileMsg({ type: "error", text: "Username must be at least 3 characters." });
      return;
    }

    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await axios.put("/api/auth/username", { newUsername: newUsername.trim() });
      if (updateUser) {
        updateUser({ username: res.data.username });
      }
      setProfileMsg({ type: "success", text: "Username updated successfully." });
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update username.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setProfileMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSavingProfile(true);
    setProfileMsg(null);

    try {
      await axios.put("/api/auth/password", {
        currentPassword,
        newPassword,
      });
      setProfileMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update password.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col gap-2 mb-6 border-b border-zp-border pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zp-primary-400 mb-1">
          <Settings size={14} /> Configuration
        </div>
        <h1 className="text-xl font-bold text-zp-text-primary">Settings</h1>
        <p className="text-sm text-zp-text-muted mt-0.5">
          Configure panel preferences, runtime environments, and account credentials.
        </p>
      </div>

      {/* Admin Panel Settings */}
      {user?.role === "admin" && (
        <div className="zp-card mb-6">
          <div className="px-6 py-4 border-b border-zp-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-zp-primary-400">
                <Settings size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zp-text-primary">Panel Configuration</h2>
                <p className="text-xs text-zp-text-muted">Global branding and deployment options</p>
              </div>
            </div>
          </div>

          {settingsMsg && (
            <div
              className={`mx-6 mb-4 flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm ${
                settingsMsg.type === "success"
                  ? "bg-zp-success/10 border border-zp-success/30 text-zp-success"
                  : "bg-zp-danger/10 border border-zp-danger/30 text-zp-danger"
              }`}
            >
              {settingsMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{settingsMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePanelSettings} className="px-6 pb-6 space-y-5">
            <div>
              <label className="zp-section-title text-xs">Panel Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sm:w-80 py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
                placeholder="zPanel"
              />
            </div>

            <div>
              <label className="zp-section-title text-xs">Default Server Runtime</label>
              <select
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                className="w-full sm:w-80 py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
              >
                <option value="docker">Docker Containers (Recommended)</option>
                <option value="local">Local Process Mode</option>
              </select>
              <p className="text-xs text-zp-text-muted mt-1.5">
                Default runtime selected when creating new servers.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="w-4 h-4 rounded bg-zp-bg-input border border-zp-border text-zp-primary-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-zp-text-primary">Allow Public User Registration</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playitActive}
                  onChange={(e) => setPlayitActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-zp-bg-input border border-zp-border text-zp-primary-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-zp-text-primary">Enable Playit.gg Tunnel Integration</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="zp-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-zp-shadow-glow disabled:opacity-50 active:scale-95"
              >
                <Save size={14} />
                <span>{savingSettings ? "Saving…" : "Save Configuration"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Profile & Security */}
      <div className="zp-card">
        <div className="px-6 py-4 border-b border-zp-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-zp-primary-400">
              <User size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zp-text-primary">Account & Credentials</h2>
              <p className="text-xs text-zp-text-muted">Update your personal login info</p>
            </div>
          </div>
        </div>

        {profileMsg && (
          <div
            className={`mx-6 mb-4 flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm ${
              profileMsg.type === "success"
                ? "bg-zp-success/10 border border-zp-success/30 text-zp-success"
                : "bg-zp-danger/10 border border-zp-danger/30 text-zp-danger"
            }`}
          >
            {profileMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        {/* Change Username */}
        <form onSubmit={handleUpdateUsername} className="px-6 pb-6 space-y-3 border-b border-zp-border">
          <label className="zp-section-title text-xs">Display Username</label>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full sm:w-80 py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
              placeholder="Username"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="zp-btn-ghost px-4 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Username
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleUpdatePassword} className="px-6 pb-6 space-y-4">
          <label className="zp-section-title text-xs">Change Password</label>
          <div className="space-y-2.5 max-w-sm">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
            />
            <input
              type="password"
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full py-2.5 px-3.5 text-sm bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="zp-btn-ghost px-4 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
