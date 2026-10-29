// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserPlus, Key, Trash2, Shield, Check, AlertCircle, RefreshCw, Lock, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create User Modal / Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password State
  const [changePasswordUserId, setChangePasswordUserId] = useState<string | null>(null);
  const [changePasswordValue, setChangePasswordValue] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await axios.get("/api/system/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorMsg("Username and password are required.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await axios.post("/api/system/users", {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      setSuccessMsg(`User '${newUsername}' created successfully.`);
      setShowCreateModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === currentUser?.id) {
      setErrorMsg("You cannot delete your own account while logged in.");
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) {
      return;
    }

    try {
      await axios.delete(`/api/system/users/${userId}`);
      setSuccessMsg(`User '${username}' deleted.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to delete user.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordUserId) return;
    if (changePasswordValue.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await axios.put(`/api/system/users/${changePasswordUserId}/password`, {
        newPassword: changePasswordValue,
      });
      setSuccessMsg("Password updated successfully.");
      setChangePasswordUserId(null);
      setChangePasswordValue("");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[rgba(139,92,246,0.18)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a78bfa] mb-1">
            <Users size={14} />
            <span>Access Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f0f4ff]">User Management</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Manage system administrators and server client permissions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#94a3b8] hover:text-[#f0f4ff] bg-[rgba(6,9,26,0.6)] border border-[rgba(139,92,246,0.18)] hover:border-[rgba(139,92,246,0.35)] rounded-xl transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)] transition-all active:scale-95"
            >
              <UserPlus size={14} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <Check size={18} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] backdrop-blur-xl overflow-hidden shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-[rgba(139,92,246,0.12)] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Accounts ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#94a3b8]">Loading accounts…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[#94a3b8]">No user accounts found.</div>
        ) : (
          <div className="divide-y divide-[rgba(139,92,246,0.1)]">
            {users.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              const isChangingThis = changePasswordUserId === u.id;

              return (
                <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[rgba(124,58,237,0.04)] transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/25 to-indigo-600/15 border border-[rgba(139,92,246,0.25)] flex items-center justify-center font-bold text-sm text-[#a78bfa] shrink-0 shadow-[0_0_12px_rgba(124,58,237,0.25)]">
                      {u.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f0f4ff] truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/15 text-[#a78bfa] border border-purple-500/30 rounded-md">
                            You
                          </span>
                        )}
                        {u.isGoogleUser && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-md">
                            Google
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748b] capitalize mt-0.5 font-medium">Role: {u.role || "User"}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => {
                        setChangePasswordUserId(isChangingThis ? null : u.id);
                        setChangePasswordValue("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#94a3b8] hover:text-[#f0f4ff] bg-[rgba(6,9,26,0.6)] hover:bg-[rgba(124,58,237,0.15)] border border-[rgba(139,92,246,0.2)] rounded-xl transition-all"
                      title="Reset Password"
                    >
                      <Key size={13} />
                      <span>Password</span>
                    </button>
                    {!isCurrent && currentUser?.role === "admin" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 text-[#64748b] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Change Password Input Field if active */}
                  {isChangingThis && (
                    <form onSubmit={handleChangePassword} className="w-full pt-3 mt-2 border-t border-[rgba(139,92,246,0.15)] flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Enter new password (min 8 chars)"
                        value={changePasswordValue}
                        onChange={(e) => setChangePasswordValue(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-3.5 py-2 text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangePasswordUserId(null)}
                        className="px-3 py-2 text-xs text-[#94a3b8] hover:text-white"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.3)] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(124,58,237,0.3)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#f0f4ff]">Create New Account</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#64748b] hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] mb-5">Provision a new administrator or client account.</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
                  placeholder="e.g. admin2, developer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl text-white outline-none"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="user">Standard User (Assigned Servers Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
