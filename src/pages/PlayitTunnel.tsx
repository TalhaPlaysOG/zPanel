// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Globe, Play, Square, Loader2, Link as LinkIcon, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

export default function PlayitTunnel({ serverId }: { serverId: string }) {
  const [status, setStatus] = useState<"running" | "stopped" | "checking">("checking");
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverRuntimeType, setServerRuntimeType] = useState<string>("docker");

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const serverRes = await axios.get(`/api/servers/${serverId}`);
      setServerRuntimeType(serverRes.data.runtimeType || "docker");
      const res = await axios.get(`/api/servers/${serverId}/playit`);
      setStatus(res.data.status);
      setClaimLink(res.data.claimLink || null);
      if (res.data.logs !== undefined) {
        setLogs(res.data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch Playit status", e);
    }
  };

  const generateTunnel = async () => {
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/start`);
      setStatus("running");
      fetchStatus();
    } catch (e) {
      console.error("Failed to start tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const stopTunnel = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`/api/servers/${serverId}/playit/stop`);
      setStatus("stopped");
      setClaimLink(null);
      setLogs("");
      fetchStatus();
    } catch (e) {
      console.error("Failed to stop tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTunnel = async () => {
    setShowResetConfirm(false);
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/reset`);
      await axios.post(`/api/servers/${serverId}/playit/start`);
      setStatus("running");
      fetchStatus();
    } catch (e) {
      console.error("Failed to reset tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#f0f4ff] mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#a78bfa]" />
            Playit Global Tunnel
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Forward game traffic through Playit.gg network to bypass CGNAT and port restrictions.
          </p>
        </div>

        {serverRuntimeType === 'local' ? (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-2xl p-5 mb-4">
            <h3 className="text-[#a78bfa] font-bold text-sm mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Local Process Playit (Beta)
            </h3>
            <p className="text-[#94a3b8] text-xs leading-relaxed">
              Playit tunnel integration for Local Process servers is currently in Beta. Ensure direct host socket routing before public release.
            </p>
          </div>
        ) : null}

        <div className={`bg-[rgba(6,9,26,0.6)] border border-[rgba(139,92,246,0.18)] rounded-2xl p-5 shadow-sm ${serverRuntimeType === 'local' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#64748b] block mb-1">Tunnel Status</span>
              <div className="flex items-center gap-2">
                {status === "checking" ? (
                  <><Loader2 className="w-4 h-4 text-[#94a3b8] animate-spin" /><span className="text-[#94a3b8] text-sm">Checking…</span></>
                ) : status === "running" ? (
                  <>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">Running Online</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500" />
                    </span>
                    <span className="text-[#64748b] font-medium text-sm">Stopped</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              {status !== "running" ? (
                <button 
                  onClick={generateTunnel}
                  disabled={isProcessing || status === "checking"}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-[0_0_16px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 active:scale-95"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Generate Tunnel</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={stopTunnel}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    <span>Stop Tunnel</span>
                  </button>
                  <button 
                    onClick={generateTunnel}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Restart</span>
                  </button>
                  {!showResetConfirm ? (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-[#a78bfa] border border-purple-500/20 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Reset Agent</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-[#a78bfa]">Reset agent & IP?</span>
                      <button
                        onClick={resetTunnel}
                        disabled={isProcessing}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-all active:scale-95"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="bg-white/10 text-[#94a3b8] hover:text-white px-2 py-1 rounded-lg text-xs transition-all"
                      >
                        No
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {claimLink && (
            <div className="mt-5 p-4 bg-purple-600/15 border border-purple-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-purple-400" /> Claim Link Generated
                </h3>
                <p className="text-xs text-[#94a3b8]">Click the link below to link this daemon agent to your Playit.gg account.</p>
              </div>
              <a 
                href={claimLink} 
                target="_blank" 
                rel="noreferrer"
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:brightness-110 transition-all shrink-0 text-center"
              >
                Claim Agent
              </a>
            </div>
          )}
        </div>

        {/* Tunnel Output Box */}
        <div className="bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.18)] rounded-2xl p-4 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
            Tunnel Terminal Output
          </h3>
          <div className="flex-1 bg-[#06091a] rounded-xl p-3.5 font-mono text-xs text-[#f0f4ff] overflow-y-auto whitespace-pre-wrap border border-[rgba(139,92,246,0.12)] custom-scrollbar">
            {logs || "Waiting for output..."}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
