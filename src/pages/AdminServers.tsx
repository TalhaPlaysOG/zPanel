// @ts-nocheck
import PageHeader from "../components/PageHeader";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Server, Settings, Search, Trash2, Edit2, Play, Square, PauseCircle, MoreVertical, ChevronRight, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <div className="w-full relative z-10 space-y-6">
      <PageHeader 
        title="Manage Servers" 
        subtitle="FLEET ADMINISTRATION" 
      />

      {/* Search Bar */}
      <div className="bg-[rgba(15,21,53,0.7)] border border-[rgba(139,92,246,0.18)] rounded-2xl p-3.5 flex items-center shadow-lg backdrop-blur-xl">
        <Search className="w-5 h-5 text-[#64748b] ml-1 mr-3" />
        <input 
          type="text"
          placeholder="Search fleet by server name or UUID..."
          className="bg-transparent outline-none flex-1 text-[#f0f4ff] placeholder-[#64748b] text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredServers.map(server => (
            <div 
              key={server.id} 
              className="bg-[rgba(15,21,53,0.7)] border border-[rgba(139,92,246,0.18)] hover:border-[rgba(139,92,246,0.35)] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-purple-600/15 rounded-xl flex items-center justify-center border border-purple-500/30 text-[#a78bfa] shadow-[0_0_15px_rgba(124,58,237,0.3)] shrink-0">
                  <Server className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-[#f0f4ff] truncate">{server.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#94a3b8] mt-1">
                    <span className="font-mono">{server.type} • {server.version}</span>
                    <span>•</span>
                    <span>Owner: <strong className="text-[#f0f4ff]">{getUsername(server.owner)}</strong></span>
                    {server.suspended && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold uppercase text-[10px]">
                        SUSPENDED
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <ActionMenu 
                  server={server} 
                  setEditingServer={setEditingServer} 
                  setRam={setRam} 
                  setCpu={setCpu} 
                  setDisk={setDisk} 
                  setSuspendingServer={setSuspendingServer} 
                  setSuspendDuration={setSuspendDuration} 
                  setDeletingServer={setDeletingServer} 
                />
                <Link 
                  to={`/servers/${server.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all text-xs font-bold shadow-[0_0_15px_rgba(124,58,237,0.5)] active:scale-95"
                >
                  <span>Console</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
          {filteredServers.length === 0 && (
            <div className="text-center py-12 text-[#94a3b8] bg-[rgba(15,21,53,0.4)] rounded-2xl border border-[rgba(139,92,246,0.1)]">
              No servers found matching your query.
            </div>
          )}
        </div>
      )}

      {/* Edit Resources Modal */}
      <AnimatePresence>
        {editingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.3)] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(124,58,237,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#f0f4ff]">Edit Resources: {editingServer.name}</h2>
                <button onClick={() => setEditingServer(null)} className="p-1 text-[#64748b] hover:text-white rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateResources}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">RAM (GB)</label>
                    <input 
                      type="number" 
                      value={ram} 
                      onChange={e => setRam(e.target.value)} 
                      required min="1" 
                      className="w-full bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl px-3.5 py-2 text-sm text-white font-mono outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">CPU (%)</label>
                    <input 
                      type="number" 
                      value={cpu} 
                      onChange={e => setCpu(e.target.value)} 
                      required min="50" 
                      className="w-full bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl px-3.5 py-2 text-sm text-white font-mono outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">Disk (GB)</label>
                    <input 
                      type="number" 
                      value={disk} 
                      onChange={e => setDisk(e.target.value)} 
                      required min="1" 
                      className="w-full bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl px-3.5 py-2 text-sm text-white font-mono outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingServer(null)} className="px-4 py-2 text-xs font-semibold text-[#94a3b8] hover:text-white">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)]">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspend Modal */}
      <AnimatePresence>
        {suspendingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.3)] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(124,58,237,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500 to-purple-500" />
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#f0f4ff]">Manage Suspension: {suspendingServer.name}</h2>
                <button onClick={() => setSuspendingServer(null)} className="p-1 text-[#64748b] hover:text-white rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateSuspend}>
                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">Suspension Duration</label>
                  <select 
                    value={suspendDuration} 
                    onChange={e => setSuspendDuration(e.target.value)}
                    className="w-full bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="null">Not Suspended (Active)</option>
                    <option value="24_hours">24 Hours</option>
                    <option value="1_week">1 Week</option>
                    <option value="1_month">1 Month</option>
                    <option value="2_months">2 Months</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setSuspendingServer(null)} className="px-4 py-2 text-xs font-semibold text-[#94a3b8] hover:text-white">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/30">Apply</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deletingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[rgba(10,14,36,0.95)] border border-rose-500/30 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-600 to-red-500" />
              <div className="flex items-start mb-4">
                <div className="mr-4 shrink-0 rounded-xl bg-rose-600/20 p-3 text-rose-400">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Delete &ldquo;{deletingServer.name}&rdquo;?</h2>
                  <p className="text-sm text-[#94a3b8] leading-relaxed">
                    This permanently deletes the server, all worlds, files, backups, logs, configuration, SFTP access, and database records. The server is stopped first.
                    <strong className="text-rose-300"> This action cannot be undone.</strong>
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                Type <span className="font-mono text-rose-300">{deletingServer.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder={deletingServer.name}
                className="w-full bg-black/60 border border-rose-500/30 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none"
              />

              {deleteError && (
                <p className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{deleteError}</p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setDeletingServer(null); setDeleteConfirmText(""); setDeleteError(null); }}
                  disabled={deleteBusy}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-[rgba(255,255,255,0.06)] text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                >Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleteBusy || deleteConfirmText.trim() !== String(deletingServer.name || "").trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
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

function ActionMenu({ server, setEditingServer, setRam, setCpu, setDisk, setSuspendingServer, setSuspendDuration, setDeletingServer }: any) {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const handleClick = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 bg-[rgba(6,9,26,0.6)] hover:bg-[rgba(124,58,237,0.15)] text-[#94a3b8] hover:text-white rounded-xl transition-all border border-[rgba(139,92,246,0.2)]"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.25)] rounded-xl shadow-2xl z-40 overflow-hidden flex flex-col py-1 backdrop-blur-xl"
          >
            <button 
              onClick={() => {
                setEditingServer(server);
                setRam(server.ram.toString());
                setCpu(server.cpu.toString());
                setDisk(server.disk.toString());
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-xs font-semibold text-[#94a3b8] hover:bg-[rgba(124,58,237,0.15)] hover:text-white transition-colors text-left"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2.5 text-[#a78bfa]" />
              Edit Resources
            </button>
            <button 
              onClick={() => {
                setSuspendingServer(server);
                setSuspendDuration(server.suspendDuration || "null");
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-xs font-semibold text-[#94a3b8] hover:bg-[rgba(124,58,237,0.15)] hover:text-white transition-colors text-left"
            >
              <PauseCircle className="w-3.5 h-3.5 mr-2.5 text-amber-400" />
              {server.suspended ? "Manage Suspension" : "Suspend Server"}
            </button>
            <div className="h-px bg-[rgba(139,92,246,0.12)] my-1 mx-2" />
            <button 
              onClick={() => {
                setDeletingServer(server);
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2.5" />
              Delete Server
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
