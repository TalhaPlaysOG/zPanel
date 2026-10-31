// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Server, Settings, Search, Trash2, Edit2, Play, ChevronRight, X, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";

export default function AdminServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingServer, setEditingServer] = useState<any>(null);
  const [ram, setRam] = useState("");
  const [cpu, setCpu] = useState("");
  const [disk, setDisk] = useState("");

  const [suspendingServer, setSuspendingServer] = useState<any>(null);
  const [suspendDuration, setSuspendDuration] = useState("null");

  const [deletingServer, setDeletingServer] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchData = async () => {
    try {
      const [serversRes, usersRes] = await Promise.all([
        axios.get("/api/servers"),
        axios.get("/api/system/users")
      ]);
      setServers(serversRes.data);
      setUsers(usersRes.data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUsername = (id: string) => {
    const u = users.find(u => u.id === id);
    return u ? u.username : "Unknown";
  };

  const handleUpdateResources = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/servers/${editingServer.id}/resources`, {
        ram: Number(ram),
        cpu: Number(cpu),
        disk: Number(disk)
      });
      setEditingServer(null);
      fetchData();
    } catch (e) {
      alert("Failed to update resources");
    }
  };

  const handleUpdateSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const duration = suspendDuration === "null" ? null : suspendDuration;
      await axios.put(`/api/servers/${suspendingServer.id}/suspend`, {
        suspendDuration: duration
      });
      setSuspendingServer(null);
      fetchData();
    } catch (e) {
      alert("Failed to update suspension");
    }
  };

  const handleDelete = async () => {
    if (!deletingServer) return;
    if (deleteConfirmText.trim() !== String(deletingServer.name || "").trim()) {
      setDeleteError("Type the server name exactly to confirm deletion.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/servers/${deletingServer.id}`);
      setDeletingServer(null);
      setDeleteConfirmText("");
      fetchData();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.error || e?.message || "Failed to delete server");
    } finally {
      setDeleteBusy(false);
    }
  };

  const filteredServers = servers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderEmptyState = () => (
    <div className="zp-card p-12 text-center">
      <Server className="w-12 h-12 mx-auto mb-3 text-zp-text-muted" />
      <h3 className="text-sm font-bold text-zp-text-secondary mb-1">No servers found</h3>
      <p className="text-xs text-zp-text-muted">No server instances match your query.</p>
    </div>
  );

  const renderServerGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredServers.map((server) => {
        const online = server.status === "online";
        return (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="zp-card-lift zp-card overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-zp-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zp-bg-input border border-zp-border flex items-center justify-center shrink-0">
                  <Server size={14} className="text-zp-primary-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zp-text-primary truncate">{server.name}</h3>
                  <p className="text-[10px] font-mono text-zp-text-muted truncate">
                    {server.type} • {server.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="zp-badge px-2.5 py-0.5 text-[0.6rem]"
                  style={{
                    backgroundColor: online ? "rgba(54, 201, 143, 0.12)" : "rgba(237, 98, 111, 0.12)",
                    color: online ? "var(--zp-success)" : "var(--zp-danger)",
                    borderColor: online ? "rgba(54, 201, 143, 0.25)" : "rgba(237, 98, 111, 0.25)",
                  }}
                >
                  {online ? "Online" : "Stopped"}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 text-xs mb-2">
                <User className="w-3 h-3 text-zp-text-dim shrink-0" />
                <span className="font-mono text-zp-text-muted">Owner: {getUsername(server.owner)}</span>
              </div>
              {server.suspended && (
                <span className="zp-badge px-2.5 py-0.5 text-[0.6rem]"
                  style={{
                    backgroundColor: "rgba(237, 98, 111, 0.12)",
                    color: "var(--zp-danger)",
                    borderColor: "rgba(237, 98, 111, 0.25)",
                  }}
                >
                  Suspended
                </span>
              )}
            </div>

            <div className="p-4 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setEditingServer(server);
                  setRam(server.ram?.toString() || "");
                  setCpu(server.cpu?.toString() || "");
                  setDisk(server.disk?.toString() || "");
                }}
                className="zp-btn-ghost flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-zp-bg-hover transition-colors"
              >
                <Edit2 size={12} /> Edit Resources
              </button>
              <Link
                to={`/servers/${server.id}`}
                className="zp-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
              >
                <ChevronRight size={12} /> Console
              </Link>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-[1280px] mx-auto w-full pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-zp-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zp-primary-400 mb-1">
            <Server size={14} /> Fleet Administration
          </div>
          <h1 className="text-xl font-bold text-zp-text-primary">Manage Servers</h1>
          <p className="text-sm text-zp-text-muted mt-0.5">
            Inspect, suspend, and remove server instances across the panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/servers/create"
            className="zp-btn-primary flex items-center gap-2 text-sm font-medium px-4 py-2"
          >
            <Play size={14} /> Deploy New Instance
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="zp-input-group mb-6">
        <span className="zp-input-icon">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search fleet by server name or UUID…"
          className="w-full py-3 pl-9 pr-4 rounded-xl bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-zp-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredServers.length > 0 ? renderServerGrid() : renderEmptyState()}
      </div>

      {/* Edit Resources Modal */}
      <AnimatePresence>
        {editingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="zp-card rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-zp-shadow-card"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-zp-primary-500 to-zp-primary-700" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zp-text-primary">
                  Edit Resources: {editingServer.name}
                </h3>
                <button
                  onClick={() => setEditingServer(null)}
                  className="p-1.5 rounded-lg text-zp-text-muted hover:text-zp-text-primary hover:bg-zp-bg-hover transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateResources} className="space-y-4 mb-4">
                <div>
                  <label className="zp-section-title text-xs">RAM (GB)</label>
                  <input
                    type="number"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    required min="1"
                    className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary font-mono outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="zp-section-title text-xs">CPU (%)</label>
                  <input
                    type="number"
                    value={cpu}
                    onChange={(e) => setCpu(e.target.value)}
                    required min="50"
                    className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary font-mono outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="zp-section-title text-xs">Disk (GB)</label>
                  <input
                    type="number"
                    value={disk}
                    onChange={(e) => setDisk(e.target.value)}
                    required min="1"
                    className="w-full py-2.5 px-3.5 rounded-lg bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20 text-zp-text-primary font-mono outline-none transition-all"
                  />
                </div>
              </form>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingServer(null)}
                  className="zp-btn-ghost px-5 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="zp-btn-primary px-5 py-2 text-sm font-medium"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deletingServer && (
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
                    Delete "{deletingServer.name}"?
                  </h3>
                  <p className="text-xs text-zp-text-muted leading-relaxed">
                    This permanently deletes the server, all worlds and files, backups, logs, configuration,
                    SFTP access, and database records. The server is stopped first. This action cannot be undone.
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-zp-text-dim mb-2">
                Type <span className="font-mono text-zp-danger">{deletingServer.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
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
                  onClick={() => { setDeletingServer(null); setDeleteConfirmText(""); setDeleteError(null); }}
                  disabled={deleteBusy}
                  className="zp-btn-ghost px-5 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteBusy || deleteConfirmText.trim() !== String(deletingServer.name || "").trim()}
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
    </div>
  );
}
