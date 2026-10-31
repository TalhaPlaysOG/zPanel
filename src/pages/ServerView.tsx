// @ts-nocheck
import React, { useEffect, useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useParams, Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Terminal, Folder, Play, Square, RefreshCw, ArrowLeft, Sliders, Archive,
  AlertTriangle, Copy, Check, Menu, X, Users, LogOut, Lock, Map,
  Puzzle, Box, Network, Settings, Globe, Trash2, Monitor, Wifi
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
  const { enablePlayit } = useSettings();
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
    <div className="h-full flex items-center justify-center p-8 zp-bg-page">
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-zp-primary-500 border-t-transparent rounded-full shadow-[0_0_24px_rgba(130,149,255,0.5)]"
      />
    </div>
  );

  if (server.suspended) return (
    <div className="h-full flex items-center justify-center p-8 zp-bg-page">
      <div className="max-w-md w-full rounded-2xl border border-zp-danger/30 bg-zp-card backdrop-blur-xl p-8 text-center flex flex-col items-center shadow-zp-shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-zp-danger/10 flex items-center justify-center border border-zp-danger/30 mb-4 shadow-[0_0_20px_rgba(237,98,111,0.2)]">
          <Lock className="w-8 h-8 text-zp-danger" />
        </div>
        <h2 className="text-xl font-bold text-zp-text-primary mb-2">Server Suspended</h2>
        <p className="text-sm text-zp-text-muted mb-6 leading-relaxed">
          This server has been suspended by an administrator. You cannot access or manage this server until the suspension is lifted.
        </p>
        <Link 
          to="/servers" 
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-zp-primary-600 to-zp-primary-700 text-white text-sm font-semibold rounded-xl shadow-zp-shadow-glow hover:brightness-110 transition-all"
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
    <div className="flex h-screen zp-bg-page text-zp-text-primary overflow-hidden select-none font-sans">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Server Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zp-sidebar/90 backdrop-blur-xl border-r border-zp-border flex flex-col shadow-zp-shadow-card transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-zp-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link 
              to="/servers" 
              className="p-1.5 rounded-xl border border-zp-primary-500/20 bg-zp-primary-500/10 text-zp-primary-400 hover:text-zp-text-primary hover:bg-zp-primary-500/20 transition-all shrink-0"
              title="Back to fleet"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-zp-text-primary truncate" title={server.name}>
                {server.name}
              </h1>
              <p className="text-[10px] text-zp-text-dim uppercase tracking-wider font-mono truncate">
                {server.type || "Minecraft"} • {server.version || "latest"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-zp-text-muted hover:text-zp-text-primary rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Nav Tabs */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
          {/* Quick status summary badge */}
          <div className="mb-3 p-3 rounded-xl bg-zp-bg-input border border-zp-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  {isServerOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zp-success opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isServerOnline ? 'bg-zp-success' : 'bg-zp-text-dim'}`} />
                </span>
                <span className={`text-xs font-semibold capitalize ${isServerOnline ? 'text-zp-success' : 'text-zp-text-dim'}`}>
                  {server.status}
                </span>
              </div>
              <button 
                onClick={handleCopyIp} 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zp-primary-500/10 hover:bg-zp-primary-500/20 border border-zp-primary-500/20 text-[11px] font-mono text-zp-primary-400 transition-colors"
                title="Copy connection address"
              >
                <span>{server.ipAlias ? `${server.ipAlias}:${server.port}` : `:${server.port}`}</span>
                {copied ? <Check size={11} className="text-zp-success" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-zp-text-dim mb-1.5 px-3 uppercase tracking-wider">
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
                    ? 'bg-gradient-to-r from-zp-primary-500/25 to-zp-primary-500/05 text-zp-text-primary border-l-2 border-zp-primary-500 shadow-[inset_0_0_12px_rgba(130,149,255,0.2)]' 
                    : 'text-zp-text-muted hover:text-zp-text-primary hover:bg-zp-bg-hover border-l-2 border-transparent'
                }`}
              >
                <div className={isActive ? 'text-zp-primary-500' : 'text-zp-text-muted'}>
                  {tab.icon}
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}
          
          <div className="h-px bg-zp-border my-3" />

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
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-zp-danger/70 hover:text-zp-danger hover:bg-zp-danger/10 border-l-2 border-transparent transition-all"
            >
              <Trash2 size={16} />
              <span>Delete Server</span>
            </button>
          )}

          <div className="h-px bg-zp-border my-1" />

          <Link
            to="/servers"
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-zp-text-muted hover:text-zp-text-primary hover:bg-zp-bg-hover transition-all"
          >
            <LogOut size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Server Workspace */}
      <div className="flex-1 flex flex-col h-full zp-bg-page overflow-hidden relative">
        
        {/* Sticky Server Top Header with Power Buttons */}
        <header className="bg-zp-sidebar/80 backdrop-blur-xl border-b border-zp-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-lg relative z-20">
          
          {/* Left: Mobile hamburger + Server Name + Status pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl border border-zp-border bg-zp-bg-input text-zp-primary-400 hover:text-zp-text-primary transition-all shrink-0"
              title="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-zp-text-primary truncate">
                {server.name}
              </h1>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/50 border border-zp-border shrink-0">
                <span className="relative flex h-2 w-2">
                  {isServerOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zp-success opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isServerOnline ? 'bg-zp-success' : 'bg-zp-text-dim'}`} />
                </span>
                <span className={`text-[11px] font-mono font-semibold capitalize ${isServerOnline ? 'text-zp-success' : 'text-zp-text-dim'}`}>
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
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-zp-bg-hover border border-zp-primary-500/20 text-xs font-mono text-zp-primary-400 hover:text-zp-text-primary transition-all cursor-pointer" 
              title="Click to copy server address"
            >
              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                {server.ipAlias ? `${server.ipAlias}:${server.port}` : `:${server.port}`}
              </span>
              {copied ? <Check size={13} className="text-zp-success shrink-0" /> : <Copy size={13} className="shrink-0" />}
            </button>

            {/* Start / Stop Button */}
            {!isServerOnline ? (
              <button 
                disabled={isProcessing} 
                onClick={() => handleAction('start')} 
                className="px-4 py-1.5 sm:py-2 bg-zp-success/20 hover:bg-zp-success/30 text-zp-success font-bold rounded-xl transition-all border border-zp-success/40 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(54,201,143,0.4)] active:scale-95 disabled:opacity-40 gap-1.5"
                title="Start Server"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-zp-success/50 border-t-zp-success rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-zp-success text-zp-success" />
                )}
                <span>Start</span>
              </button>
            ) : (
              <button 
                disabled={isProcessing} 
                onClick={() => handleAction('stop')} 
                className="px-4 py-1.5 sm:py-2 bg-zp-danger/20 hover:bg-zp-danger/30 text-zp-danger font-bold rounded-xl transition-all border border-zp-danger/40 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(237,98,111,0.4)] active:scale-95 disabled:opacity-40 gap-1.5"
                title="Stop Server"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-zp-danger/50 border-t-zp-danger rounded-full animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-zp-danger text-zp-danger" />
                )}
                <span>Stop</span>
              </button>
            )}

            {/* Restart Button */}
            <button 
              disabled={isProcessing} 
              onClick={() => handleAction('restart')} 
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-zp-warning/15 hover:bg-zp-warning/25 text-zp-warning font-bold rounded-xl transition-all border border-zp-warning/35 flex items-center justify-center text-xs sm:text-sm shadow-[0_0_16px_-4px_rgba(233,182,91,0.3)] active:scale-95 disabled:opacity-40 gap-1.5"
              title="Restart Server"
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-zp-warning/50 border-t-zp-warning rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zp-warning" />
              )}
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
        </header>

        {/* Tab Routes Container */}
        <div className="flex-1 relative flex flex-col min-h-0 zp-bg-page overflow-hidden">
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
              className="bg-zp-card border border-zp-border shadow-zp-shadow-card rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-zp-primary-500 to-zp-primary-700" />
              <div className="flex items-start mb-4">
                <div className="bg-zp-warning/15 border border-zp-warning/30 p-3 rounded-xl mr-4 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-zp-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zp-text-primary mb-1">High RAM Allocation</h3>
                  <p className="text-zp-text-muted text-sm leading-relaxed">
                    This instance is configured to use up to <strong className="text-zp-text-primary">{server?.ram}GB</strong> of RAM, but this host only has <strong className="text-zp-text-primary">{totalSystemRam.toFixed(1)}GB</strong> physically available.
                  </p>
                  <p className="text-zp-text-dim text-xs leading-relaxed mt-2">
                    Memory is allocated dynamically on-demand, but if consumption exceeds physical host capacity, the process may be terminated by the OS out-of-memory killer.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRamWarning(false)}
                  className="px-4 py-2 bg-zp-bg-input hover:bg-zp-bg-hover text-zp-text-muted hover:text-zp-text-primary font-medium rounded-xl transition-colors border border-zp-border text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRamWarning(false);
                    executeAction('start');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-zp-primary-600 to-zp-primary-700 text-white font-bold rounded-xl transition-all shadow-zp-shadow-glow text-xs"
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
              className="bg-zp-card backdrop-blur-xl border border-zp-danger/40 p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-zp-shadow-card ring-1 ring-zp-danger/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-zp-danger-600 to-zp-danger-500" />
              <div className="flex items-start mb-4">
                <div className="bg-zp-danger/20 p-3 rounded-xl mr-4 text-zp-danger shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zp-text-primary mb-1">Delete &ldquo;{server.name}&rdquo;?</h3>
                  <p className="text-sm text-zp-text-muted leading-relaxed">
                    This permanently deletes the server, all worlds and files, backups, logs, configuration,
                    SFTP access, tunnel settings and database records. The server is stopped first.
                    <strong className="text-zp-danger"> This action cannot be undone.</strong>
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-zp-text-dim mb-2">
                Type <span className="font-mono text-zp-danger">{server.name}</span> to confirm
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
                className="w-full bg-zp-bg-input border border-zp-danger/30 focus:border-zp-primary-500 rounded-xl px-4 py-2.5 text-zp-text-primary outline-none font-mono text-sm"
              />

              {deleteError && (
                <p className="mt-3 text-xs text-zp-danger bg-zp-danger/10 border border-zp-danger/30 rounded-lg px-3 py-2">{deleteError}</p>
              )}

              <div className="flex justify-end gap-2.5 mt-6">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(null); }}
                  disabled={deleteBusy}
                  className="px-5 py-2.5 bg-zp-bg-input hover:bg-zp-bg-hover text-zp-text-muted font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteServer}
                  disabled={deleteBusy || deleteConfirmText.trim() !== String(server.name || "").trim()}
                  className="px-5 py-2.5 bg-zp-danger-600 hover:bg-zp-danger-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
