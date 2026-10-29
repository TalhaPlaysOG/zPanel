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

  // Panel settings form
  const [name, setName] = useState(panelName || "zPanel");
  const [allowRegistration, setAllowRegistration] = useState(enableRegistration !== false);
  const [playitActive, setPlayitActive] = useState(enablePlayit || false);
  const [runtime, setRuntime] = useState(defaultRuntime || "docker");

  // Profile forms
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status messages
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
    <div className="space-y-8 max-w-4xl">
      {/* Top Header */}
      <div className="pb-5 border-b border-[rgba(139,92,246,0.18)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a78bfa] mb-1">
          <Settings size={14} />
          <span>Configuration</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f0f4ff]">Settings</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Configure panel preferences, runtime environments, and account credentials.
        </p>
      </div>

      {/* Admin Panel Settings */}
      {user?.role === "admin" && (
        <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] backdrop-blur-xl p-6 sm:p-7 space-y-6 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[rgba(139,92,246,0.12)]">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[#a78bfa]">
              <Settings size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f0f4ff]">Panel Configuration</h2>
              <p className="text-xs text-[#64748b]">Global branding and deployment options</p>
            </div>
          </div>

          {settingsMsg && (
            <div
              className={`flex items-center gap-3 p-3.5 rounded-xl text-sm ${
                settingsMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {settingsMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{settingsMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePanelSettings} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Panel Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
                placeholder="zPanel"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Default Server Runtime</label>
              <select
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
              >
                <option value="docker">Docker Containers (Recommended)</option>
                <option value="local">Local Process Mode</option>
              </select>
              <p className="text-xs text-[#64748b] mt-1.5">
                Default runtime selected when creating new servers.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="w-4 h-4 rounded bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.3)] text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-[#f0f4ff]">Allow Public User Registration</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playitActive}
                  onChange={(e) => setPlayitActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.3)] text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-sm font-medium text-[#f0f4ff]">Enable Playit.gg Tunnel Integration</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)] transition-all disabled:opacity-50 active:scale-95"
              >
                <Save size={14} />
                <span>{savingSettings ? "Saving…" : "Save Configuration"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Profile & Security */}
      <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] backdrop-blur-xl p-6 sm:p-7 space-y-6 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[rgba(139,92,246,0.12)]">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[#a78bfa]">
            <User size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f0f4ff]">Account & Credentials</h2>
            <p className="text-xs text-[#64748b]">Update your personal login info</p>
          </div>
        </div>

        {profileMsg && (
          <div
            className={`flex items-center gap-3 p-3.5 rounded-xl text-sm ${
              profileMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {profileMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        {/* Change Username */}
        <form onSubmit={handleUpdateUsername} className="space-y-3 pb-6 border-b border-[rgba(139,92,246,0.12)]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Display Username</label>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
              placeholder="Username"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="self-start sm:self-auto px-4 py-2.5 text-xs font-semibold text-[#94a3b8] hover:text-[#f0f4ff] bg-[rgba(6,9,26,0.6)] hover:bg-[rgba(124,58,237,0.15)] border border-[rgba(139,92,246,0.2)] rounded-xl transition-all"
            >
              Update Username
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Change Password</label>
          <div className="space-y-2.5 max-w-sm">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
            />
            <input
              type="password"
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2.5 text-xs font-semibold text-[#94a3b8] hover:text-[#f0f4ff] bg-[rgba(6,9,26,0.6)] hover:bg-[rgba(124,58,237,0.15)] border border-[rgba(139,92,246,0.2)] rounded-xl transition-all"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
