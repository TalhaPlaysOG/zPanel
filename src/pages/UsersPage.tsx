// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserPlus, Key, Trash2, Shield, Check, AlertCircle, RefreshCw, Lock, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { AnimatePresence } from "framer-motion";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [changePasswordUserId, setChangePasswordUserId] = useState<string | null>(null);
  const [changePasswordValue, setChangePasswordValue] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTargetUserName, setDeleteTargetUserName] = useState("");

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
    setDeleteTarget(userId);
    setDeleteTargetUserName(username);
    setDeleteConfirm("");
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirm !== deleteTargetUserName) {
      setDeleteError("Type the username exactly to confirm deletion.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/system/users/${deleteTarget}`);
      setSuccessMsg(`User '${deleteTargetUserName}' deleted.`);
      setDeleteTarget(null);
      setDeleteConfirm("");
      setDeleteError(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || "Failed to delete user.");
    } finally {
      setDeleteBusy(false);
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

  const avatar = (u: any) => u.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-[1280px] mx-auto w-full pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-zp-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zp-primary-400 mb-1">
            <Users size={14} /> Access Control
          </div>
          <h1 className="text-xl font-bold text-zp-text-primary">User Management</h1>
          <p className="text-sm text-zp-text-muted mt-0.5">
            Manage system administrators and client permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="zp-btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="zp-btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <UserPlus size={14} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-3 px-3.5 py-3 rounded-lg border border-zp-danger/30 bg-zp-danger/10 text-xs text-zp-danger/90">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 px-3.5 py-3 rounded-lg border border-zp-success/30 bg-zp-success/10 text-xs text-zp-success/90">
          <Check size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="zp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-zp-border">
          <h3 className="text-sm font-bold text-zp-text-primary">Accounts ({users.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zp-text-muted">
            <div className="w-8 h-8 border-2 border-zp-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading accounts…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-zp-text-muted">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <span>No user accounts found.</span>
          </div>
        ) : (
          <div className="divide-y divide-zp-border">
            {users.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              const isChangingThis = changePasswordUserId === u.id;

              return (
                <div key={u.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zp-bg-hover transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zp-bg-input border border-zp-border flex items-center justify-center font-bold text-sm text-zp-text-primary shrink-0">
                      {avatar(u)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zp-text-primary truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="zp-badge px-2 py-0.5 text-[0.55rem]" style={{
                            backgroundColor: "rgba(130, 149, 255, 0.12)",
                            color: "var(--zp-primary-500)",
                            borderColor: "rgba(130, 149, 255, 0.25)",
                          }}
                        >You</span>
                        )}
                        {u.isGoogleUser && (
                          <span className="zp-badge px-2 py-0.5 text-[0.55rem]" style={{
                            backgroundColor: "rgba(102, 166, 255, 0.12)",
                            color: "var(--zp-info)",
                            borderColor: "rgba(102, 166, 255, 0.25)",
                          }}
                        >Google</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zp-text-muted capitalize font-medium mt-0.5">
                        Role: {u.role || "user"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => {
                        setChangePasswordUserId(isChangingThis ? null : u.id);
                        setChangePasswordValue("");
                      }}
                      className="zp-btn-ghost flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg hover:bg-zp-bg-hover transition-colors"
                    >
                      <Key size={13} />
                      <span>Password</span>
                    </button>
                    {!isCurrent && currentUser?.role === "admin" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 rounded-lg text-zp-text-dim hover:text-zp-danger hover:bg-zp-danger/10 transition-colors border border-transparent hover:border-zp-danger/20"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {isChangingThis && (
                    <form onSubmit={handleChangePassword} className="w-full pt-3 mt-2 border-t border-zp-border flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Enter new password (min 8 chars)"
                        value={changePasswordValue}
                        onChange={(e) => setChangePasswordValue(e.target.value)}
                        className="flex-1 py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 text-zp-text-primary font-mono outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="zp-btn-primary px-4 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangePasswordUserId(null)}
                        className="zp-btn-ghost px-3 py-2 text-xs font-medium"
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

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="zp-card rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-zp-shadow-card border-zp-danger/40 ring-1 ring-zp-danger/20"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-zp-danger-600 to-zp-danger-500" />
              <div className="flex items-start mb-4">
                <div className="mr-4 shrink-0 rounded-lg bg-zp-danger/20 p-2.5 text-zp-danger">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zp-text-primary mb-1">
                    Delete "{deleteTargetUserName}"?
                  </h3>
                  <p className="text-xs text-zp-text-muted leading-relaxed">
                    This permanently removes the user account and all associated panel data. This action cannot be undone.
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-zp-text-dim mb-2">
                Type <span className="font-mono text-zp-danger">{deleteTargetUserName}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoFocus
                className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 text-zp-text-primary font-mono outline-none"
              />

              {deleteError && (
                <p className="mt-3 px-3 py-2 rounded-lg text-xs text-zp-danger bg-zp-danger/10 border border-zp-danger/30">
                  {deleteError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 mt-6">
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); setDeleteError(null); }}
                  disabled={deleteBusy}
                  className="zp-btn-ghost px-5 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteBusy || deleteConfirm !== deleteTargetUserName}
                  className="zp-btn-danger px-5 py-2 text-sm font-medium disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteBusy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="zp-card rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-zp-shadow-card"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-zp-primary-500 to-zp-primary-700" />
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zp-text-primary">Create New Account</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-zp-text-muted hover:text-zp-text-primary hover:bg-zp-bg-hover transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-zp-text-muted mb-4">Provision a new administrator or client account.</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="zp-section-title text-xs">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
                  placeholder="e.g. admin2, developer"
                />
              </div>

              <div>
                <label className="zp-section-title text-xs">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="zp-section-title text-xs">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="user">Standard User (Assigned Servers Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="zp-btn-ghost px-5 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="zp-btn-primary px-5 py-2 text-sm font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
