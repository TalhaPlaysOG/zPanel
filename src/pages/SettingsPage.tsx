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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure panel preferences, runtime environments, and account credentials.
        </p>
      </div>

      {/* Admin Panel Settings */}
      {user?.role === "admin" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Settings size={18} className="text-theme-400" />
            <h2 className="text-sm font-semibold text-white">Panel Configuration</h2>
          </div>

          {settingsMsg && (
            <div
              className={`flex items-center gap-3 p-3.5 rounded-lg text-sm ${
                settingsMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {settingsMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{settingsMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePanelSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Panel Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
                placeholder="zPanel"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Default Server Runtime</label>
              <select
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
              >
                <option value="docker">Docker Containers (Recommended)</option>
                <option value="local">Local Process Mode</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Preferred runtime for newly deployed servers.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-theme-600 focus:ring-0"
                />
                <span className="text-sm text-zinc-200">Allow New User Registration</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playitActive}
                  onChange={(e) => setPlayitActive(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-theme-600 focus:ring-0"
                />
                <span className="text-sm text-zinc-200">Enable Playit.gg Tunnel Integration</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-theme-600 hover:bg-theme-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                <span>{savingSettings ? "Saving..." : "Save Configuration"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Profile & Security */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <User size={18} className="text-theme-400" />
          <h2 className="text-sm font-semibold text-white">Account & Credentials</h2>
        </div>

        {profileMsg && (
          <div
            className={`flex items-center gap-3 p-3.5 rounded-lg text-sm ${
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
        <form onSubmit={handleUpdateUsername} className="space-y-3 pb-5 border-b border-zinc-800/80">
          <label className="block text-xs font-medium text-zinc-300">Change Username</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
              placeholder="Username"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Update Username
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <label className="block text-xs font-medium text-zinc-300">Change Password</label>
          <div className="space-y-2 max-w-sm">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
            />
            <input
              type="password"
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
