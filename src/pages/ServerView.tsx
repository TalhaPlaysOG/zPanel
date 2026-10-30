// @ts-nocheck
import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useParams, Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Terminal, Folder, Play, Square, RefreshCw, ArrowLeft, Sliders, Archive,
  AlertTriangle, Copy, Check, Menu, X, Users, LogOut, Lock, Map,
  Puzzle, Box, Network, Settings, Globe, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";
import ServerSettings from "../components/ServerSettings";
import ServerProperties from "../components/ServerProperties";
import ServerBackups from "../components/ServerBackups";
import PluginManager from "../components/PluginManager";
import ModManager from "../components/ModManager";
import PlayerManager from "../components/PlayerManager";
import SubUsersManager from "../components/SubUsersManager";
import ServerSFTP from "../components/ServerSFTP";
import PlayitTunnel from "./PlayitTunnel";
import WorldManager from "../components/WorldManager";
import { useSettings } from "../context/SettingsContext";

export default function ServerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enablePlayit, enableCloudflare } = useSettings();
  const [server, setServer] = useState<any>(null);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleCopyIp = () => {
    if (!server) return;
    const textToCopy = server.ipAlias ? `${server.ipAlias}:${server.port}` : `${window.location.hostname}:${server.port}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchServer = async () => {
    try {
      const res = await axios.get(`/api/servers/${id}`);
      setServer(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchServer();
    axios.get("/api/system/stats").then(res => {
      setTotalSystemRam(res.data.totalMemory / (1024 * 1024 * 1024));
    }).catch(() => {});
    const interval = setInterval(fetchServer, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const executeAction = async (action: string) => {
    setIsProcessing(true);
    try {
       await axios.post(`/api/servers/${id}/${action}`);
       await fetchServer();
    } catch(e) {} finally {
       setIsProcessing(false);
    }
  };

  const handleAction = async (action: string) => {
    if (action === 'start' && totalSystemRam > 0 && server?.ram > totalSystemRam && !showRamWarning) {
      setShowRamWarning(true);
      return;
    }
    executeAction(action);
  };

  const handleDeleteServer = async () => {
    if (!server) return;
    if (deleteConfirmText.trim() !== String(server.name || "").trim()) {
      setDeleteError("Type the server name exactly to confirm deletion.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/servers/${id}`);
      navigate("/servers");
    } catch (e: any) {
      setDeleteError(e?.response?.data?.error || e?.message || "Failed to delete server");
      setDeleteBusy(false);
    }
  };

  if (!server) return (
    <div className="h-full flex items-center justify-center p-8 bg-[#0a0e24]">
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full shadow-[0_0_24px_rgba(139,92,246,0.5)]"
      />
    </div>
  );

  if (server.suspended) return (
    <div className="h-full flex items-center justify-center p-8 bg-[#0a0e24]">
      <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[rgba(10,14,36,0.85)] backdrop-blur-xl p-8 text-center flex flex-col items-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <Lock className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-[#f0f4ff] mb-2">Server Suspended</h2>
        <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">
          This server has been suspended by an administrator. You cannot access or manage this server until the suspension is lifted.
        </p>
        <Link 
          to="/servers" 
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)] hover:brightness-110 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );

  const serverTypeUpper = server?.type?.toUpperCase() || "";
  const isGenericApp = ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(serverTypeUpper);
  const isProxy = ["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(serverTypeUpper);

  let tabs: any[] = [];
  if (isGenericApp) {
    tabs = [
      { name: "Console", path: `/servers/${id}`, exactPath: "", icon: <Terminal size={17} /> },
      { name: "File Manager", path: `/servers/${id}/files`, exactPath: "files", icon: <Folder size={17} /> },
      { name: "SFTP Details", path: `/servers/${id}/sftp`, exactPath: "sftp", icon: <Network size={17} /> },
      { name: "Backup", path: `/servers/${id}/backup`, exactPath: "backup", icon: <Archive size={17} /> },
      { name: "Sub-Users", path: `/servers/${id}/subusers`, exactPath: "subusers", icon: <Users size={17} /> },
      { name: "Settings", path: `/servers/${id}/settings`, exactPath: "settings", icon: <Settings size={17} /> },
    ];
  } else {
    tabs = [
      { name: "Terminal", path: `/servers/${id}`, exactPath: "", icon: <Terminal size={17} /> },
      { name: "Players", path: `/servers/${id}/players`, exactPath: "players", icon: <Users size={17} /> },
      { name: "File Manager", path: `/servers/${id}/files`, exactPath: "files", icon: <Folder size={17} /> },
      { name: "SFTP Details", path: `/servers/${id}/sftp`, exactPath: "sftp", icon: <Network size={17} /> },
      { name: "Sub-Users", path: `/servers/${id}/subusers`, exactPath: "subusers", icon: <Users size={17} /> },
    ];

    if (!isProxy) {
      tabs.splice(1, 0, { name: "Properties", path: `/servers/${id}/properties`, exactPath: "properties", icon: <Sliders size={17} /> });
      tabs.splice(2, 0, { name: "World", path: `/servers/${id}/world`, exactPath: "world", icon: <Map size={17} /> });
    }

    if (["PAPER", "SPIGOT", "PURPUR", "BUNGEECORD", "VELOCITY", "WATERFALL"].includes(serverTypeUpper)) {
      tabs.push({ name: "Plugins", path: `/servers/${id}/plugins`, exactPath: "plugins", icon: <Puzzle size={17} /> });
    }

    if (["FORGE", "FABRIC", "NEOFORGE", "QUILT"].includes(serverTypeUpper)) {
      tabs.push({ name: "Mods", path: `/servers/${id}/mods`, exactPath: "mods", icon: <Box size={17} /> });
    }

    tabs.push(
      { name: "Settings", path: `/servers/${id}/settings`, exactPath: "settings", icon: <Settings size={17} /> },
      { name: "Backup", path: `/servers/${id}/backup`, exactPath: "backup", icon: <Archive size={17} /> }
    );

    if (enablePlayit) {
      tabs.push(
        { name: "Playit Tunnel", path: `/servers/${id}/playit`, exactPath: "playit", icon: <Globe size={17} /> }
      );
    }
  }

  const isServerOnline = server.status === 'online';

  return (
    <div className="flex h-screen bg-[#0a0e24] text-[#f0f4ff] overflow-hidden select-none">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Pterodactyl-Style Server Sidebar with Nebula Aesthetic */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[rgba(8,12,31,0.96)] backdrop-blur-2xl border-r border-[rgba(139,92,246,0.18)] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(139,92,246,0.15)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link 
              to="/servers" 
              className="p-1.5 rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(124,58,237,0.1)] text-[#a78bfa] hover:text-white hover:bg-[rgba(124,58,237,0.2)] transition-all shrink-0"
              title="Back to fleet"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-[#f0f4ff] truncate" title={server.name}>
                {server.name}
              </h1>
              <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-mono truncate">
                {server.type || "Minecraft"} • {server.version || "latest"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-[#94a3b8] hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Nav Tabs */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
          {/* Quick status summary badge */}
          <div className="mb-3 p-3 rounded-xl bg-[rgba(6,9,26,0.6)] border border-[rgba(139,92,246,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  {isServerOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isServerOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </span>
                <span className={`text-xs font-semibold capitalize ${isServerOnline ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                  {server.status}
                </span>
              </div>
              <button 
                onClick={handleCopyIp} 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[rgba(124,58,237,0.15)] hover:bg-[rgba(124,58,237,0.25)] border border-[rgba(139,92,246,0.25)] text-[11px] font-mono text-[#a78bfa] transition-colors"
                title="Copy connection address"
              >
                <span>{server.ipAlias ? `${server.ipAlias}:${server.port}` : `:${server.port}`}</span>
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-[#64748b] mb-1.5 px-3 uppercase tracking-wider">
            Management
          </div>
          
          {tabs.map(tab => {
            const isActive = location.pathname === tab.path || location.pathname === `${tab.path}/`;
            return (
              <Link 
                key={tab.name}
                to={tab.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600/25 to-purple-600/05 text-[#f0f4ff] border-l-2 border-[#8b5cf6] shadow-[inset_0_0_12px_rgba(124,58,237,0.2)]' 
                    : 'text-[#94a3b8] hover:text-[#f0f4ff] hover:bg-white/[0.04] border-l-2 border-transparent'
                }`}
              >
                <div className={isActive ? 'text-[#a78bfa]' : 'text-[#64748b]'}>
                  {tab.icon}
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}
          
          <div className="h-px bg-[rgba(139,92,246,0.12)] my-3" />

          {/* Delete Server quick action */}
          {(server && (server.owner === undefined || server.owner !== null)) && (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError(null);
                setShowDeleteModal(true);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 border-l-2 border-transparent transition-all"
            >
              <Trash2 size={16} />
              <span>Delete Server</span>
            </button>
          )}

          <div className="h-px bg-[rgba(139,92,246,0.12)] my-1" />

          <Link
            to="/servers"
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#f0f4ff] hover:bg-white/[0.04] transition-all"
          >
            <LogOut size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Server Workspace */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0e24] overflow-hidden relative">
        
        {/* Sticky Server Top Header with Power Buttons */}
        <header className="bg-[rgba(8,12,31,0.88)] backdrop-blur-xl border-b border-[rgba(139,92,246,0.18)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-lg relative z-20">
          
          {/* Left: Mobile hamburger + Server Name + Status pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(6,9,26,0.6)] text-[#a78bfa] hover:text-white transition-all shrink-0"
              title="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#f0f4ff] truncate">
                {server.name}
              </h1>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.18)] shrink-0">
                <span className="relative flex h-2 w-2">
                  {isServerOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isServerOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </span>
                <span className={`text-[11px] font-mono font-semibold capitalize ${isServerOnline ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                  {server.status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: IP Copy + Big Power Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0">
            {/* IP Badge */}
            <button 
              onClick={handleCopyIp} 
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[rgba(6,9,26,0.7)] hover:bg-[rgba(124,58,237,0.1)] border border-[rgba(139,92,246,0.2)] text-xs font-mono text-[#a78bfa] hover:text-[#f0f4ff] transition-all cursor-pointer" 
              title="Click to copy server address"
            >
              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                {server.ipAlias ? `${server.ipAlias}:${server.port}` : `:${server.port}`}
              </span>
              {copied ? <Check size={13} className="text-emerald-400 shrink-0" /> : <Copy size={13} className="shrink-0" />}
            </button>

            {/* Start / Stop Button */}
            {!isServerOnline ? (
              <button 
                disabled={isProcessing} 
                onClick={() => handleAction('start')} 
                className="px-4 py-1.5 sm:py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-all border border-emerald-500/40 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-40 gap-1.5"
                title="Start Server"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-400 text-emerald-400" />
                )}
                <span>Start</span>
              </button>
            ) : (
              <button 
                disabled={isProcessing} 
                onClick={() => handleAction('stop')} 
                className="px-4 py-1.5 sm:py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl transition-all border border-rose-500/40 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(244,63,94,0.4)] active:scale-95 disabled:opacity-40 gap-1.5"
                title="Stop Server"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-rose-400/50 border-t-rose-400 rounded-full animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-400 text-rose-400" />
                )}
                <span>Stop</span>
              </button>
            )}

            {/* Restart Button */}
            <button 
              disabled={isProcessing} 
              onClick={() => handleAction('restart')} 
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold rounded-xl transition-all border border-amber-500/35 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(245,158,11,0.3)] active:scale-95 disabled:opacity-40 gap-1.5"
              title="Restart Server"
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-amber-400/50 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              )}
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
        </header>

        {/* Tab Routes Container */}
        <div className="flex-1 relative flex flex-col min-h-0 bg-[#0a0e24] overflow-hidden">
          <Routes>
            <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
            <Route path="/players" element={<PlayerManager serverId={id!} />} />
            <Route path="/properties" element={<ServerProperties serverId={id!} />} />
            <Route path="/world" element={<WorldManager serverId={id!} server={server} onNavigateToFileManager={() => navigate(`/servers/${id}/files`)} />} />
            <Route path="/files" element={<FileManager serverId={id!} />} />
            <Route path="/sftp" element={<ServerSFTP serverId={id!} server={server} />} />
            <Route path="/subusers" element={<SubUsersManager serverId={id!} />} />
            <Route path="/settings" element={<ServerSettings serverId={id!} server={server} />} />
            <Route path="/backup" element={<ServerBackups serverId={id!} />} />
            <Route path="/plugins" element={<PluginManager serverId={id!} />} />
            <Route path="/mods" element={<ModManager serverId={id!} />} />
            {enablePlayit && <Route path="/playit" element={<PlayitTunnel serverId={id!} />} />}
          </Routes>
        </div>
      </div>

      {/* High RAM Warning Modal */}
      <AnimatePresence>
        {showRamWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.3)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(124,58,237,0.3)] rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-start mb-4">
                <div className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-xl mr-4 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#f0f4ff] mb-1">High RAM Allocation</h3>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">
                    This instance is configured to use up to <strong className="text-white">{server?.ram}GB</strong> of RAM, but this host only has <strong className="text-white">{totalSystemRam.toFixed(1)}GB</strong> physically available.
                  </p>
                  <p className="text-[#64748b] text-xs leading-relaxed mt-2">
                    Memory is allocated dynamically on-demand, but if consumption exceeds physical host capacity, the process may be terminated by the OS out-of-memory killer.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRamWarning(false)}
                  className="px-4 py-2 bg-[rgba(6,9,26,0.6)] hover:bg-white/10 text-[#94a3b8] hover:text-white font-medium rounded-xl transition-colors border border-[rgba(139,92,246,0.2)] text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRamWarning(false);
                    executeAction('start');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(124,58,237,0.5)] text-xs"
                >
                  Start Anyway
                </button>
              </div>
            </motion.div>
            {isProcessing && <LoadingOverlay />}
          </div>
        )}
      </AnimatePresence>

      {/* Delete Server Modal */}
      <AnimatePresence>
        {showDeleteModal && server && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950/95 backdrop-blur-2xl border border-rose-500/40 p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-[0_0_60px_-10px_rgba(244,63,94,0.45)] ring-1 ring-rose-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-600 to-red-500" />
              <div className="flex items-start mb-4">
                <div className="bg-rose-600/20 p-3 rounded-xl mr-4 text-rose-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Delete &ldquo;{server.name}&rdquo;?</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    This permanently deletes the server, all worlds and files, backups, logs, configuration,
                    SFTP access, tunnel settings and database records. The server is stopped first.
                    <strong className="text-rose-300"> This action cannot be undone.</strong>
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Type <span className="font-mono text-rose-300">{server.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteServer()}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder={server.name}
                className="w-full bg-black/60 border border-rose-500/30 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white outline-none font-mono text-sm"
              />

              {deleteError && (
                <p className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{deleteError}</p>
              )}

              <div className="flex justify-end gap-2.5 mt-6">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(null); }}
                  disabled={deleteBusy}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteServer}
                  disabled={deleteBusy || deleteConfirmText.trim() !== String(server.name || "").trim()}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
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
