import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserPlus, Key, Trash2, Shield, Check, AlertCircle, RefreshCw, Lock } from "lucide-react";
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">User Management</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage system administrators and panel user access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-theme-600 hover:bg-theme-500 rounded-lg shadow-sm transition-colors"
            >
              <UserPlus size={14} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <Check size={18} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Accounts ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">No user accounts found.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {users.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              const isChangingThis = changePasswordUserId === u.id;

              return (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {u.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-theme-600/20 text-theme-300 border border-theme-500/30 rounded">
                            You
                          </span>
                        )}
                        {u.isGoogleUser && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                            Google
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 capitalize mt-0.5">Role: {u.role || "User"}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => {
                        setChangePasswordUserId(isChangingThis ? null : u.id);
                        setChangePasswordValue("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <Key size={13} />
                      <span>Password</span>
                    </button>
                    {!isCurrent && currentUser?.role === "admin" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Change Password Input Field if active */}
                  {isChangingThis && (
                    <form onSubmit={handleChangePassword} className="w-full pt-3 mt-2 border-t border-zinc-800 flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Enter new password (min 8 chars)"
                        value={changePasswordValue}
                        onChange={(e) => setChangePasswordValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-3 py-1.5 text-xs font-semibold bg-theme-600 hover:bg-theme-500 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangePasswordUserId(null)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create New Account</h3>
            <p className="text-xs text-zinc-400 mb-4">Add a new administrator or user to the panel.</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
                  placeholder="e.g. admin2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="user">Standard User (Assigned Servers Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-theme-600 hover:bg-theme-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
