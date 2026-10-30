// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { 
  Cloud, Play, Square, Loader2, Link as LinkIcon, RefreshCw, 
  Copy, Check, Shield, Globe, Terminal, ExternalLink, HelpCircle, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

interface CloudflareConfig {
  mode: "quick" | "token";
  token?: string;
  protocol?: "tcp" | "udp" | "http";
  port?: number;
}

export default function CloudflareTunnel({ serverId, server }: { serverId: string; server?: any }) {
  const [status, setStatus] = useState<"running" | "stopped" | "checking" | "error">("checking");
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form states
  const [mode, setMode] = useState<"quick" | "token">("quick");
  const [token, setToken] = useState("");
  const [protocol, setProtocol] = useState<"tcp" | "udp" | "http">("tcp");
  const [port, setPort] = useState<number>(server?.port || 25565);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [serverId]);

  useEffect(() => {
    if (server?.port && !port) {
      setPort(server.port);
    }
  }, [server]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`/api/servers/${serverId}/cloudflare`);
      setStatus(res.data.status);
      setTunnelUrl(res.data.tunnelUrl || null);
      if (res.data.logs !== undefined) {
        setLogs(res.data.logs);
      }
      if (res.data.config) {
        if (res.data.config.mode) setMode(res.data.config.mode);
        if (res.data.config.token) setToken(res.data.config.token);
        if (res.data.config.protocol) setProtocol(res.data.config.protocol);
        if (res.data.config.port) setPort(res.data.config.port);
      }
    } catch (e: any) {
      console.error("Failed to fetch Cloudflare tunnel status", e);
    }
  };

  const handleStart = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (mode === "token" && !token.trim()) {
        setErrorMessage("Please provide a valid Cloudflare Zero Trust Tunnel Token.");
        setIsProcessing(false);
        return;
      }

      await axios.post(`/api/servers/${serverId}/cloudflare/start`, {
        mode,
        token: token.trim(),
        protocol,
        port: Number(port) || 25565
      });
      setStatus("running");
      await fetchStatus();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || e.message || "Failed to start Cloudflare Tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await axios.post(`/api/servers/${serverId}/cloudflare/stop`);
      setStatus("stopped");
      setTunnelUrl(null);
      await fetchStatus();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || e.message || "Failed to stop Cloudflare Tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await axios.post(`/api/servers/${serverId}/cloudflare/reset`);
      setStatus("stopped");
      setTunnelUrl(null);
      setLogs("");
      await fetchStatus();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || e.message || "Failed to reset Cloudflare Tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 h-full overflow-y-auto custom-scrollbar"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm">
                <Cloud className="w-6 h-6" />
              </div>
              Cloudflare Tunnel
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Expose your server globally through Cloudflare's secure Anycast network with DDoS defense and Zero Trust tunneling.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchStatus}
              className="p-2 bg-muted/80 hover:bg-muted text-foreground-muted hover:text-white rounded-xl border border-border-subtle transition-colors"
              title="Refresh status"
            >
              <RefreshCw size={16} className={status === "checking" ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400/70 hover:text-red-300 text-xs">Dismiss</button>
          </div>
        )}

        {/* Tunnel Status Banner */}
        <div className="bg-card/90 border border-border-subtle rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {status === "running" ? (
                  <span className="flex h-4 w-4 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                ) : status === "checking" ? (
                  <Loader2 className="w-4 h-4 text-theme-400 animate-spin" />
                ) : (
                  <span className="inline-block w-4 h-4 rounded-full bg-zinc-600"></span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Tunnel Status:</span>
                  <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                    status === "running" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    status === "checking" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status === "running" 
                    ? `Active routing (${mode === "token" ? "Zero Trust Tunnel" : "Quick Tunnel via trycloudflare.com"})`
                    : "Tunnel daemon is currently stopped"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {status === "running" ? (
                <button
                  onClick={handleStop}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  <span>Stop Tunnel</span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-600 hover:bg-theme-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-theme-600/20 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Start Tunnel</span>
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-3 py-2 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-white rounded-xl text-xs font-semibold border border-border-subtle transition-all disabled:opacity-50"
                title="Reset Tunnel Process"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Active Public URL Display */}
          {status === "running" && tunnelUrl && (
            <div className="mt-5 pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/60 p-4 rounded-xl border border-theme-500/20 shadow-inner">
              <div className="flex items-center gap-3 overflow-hidden">
                <Globe className="w-5 h-5 text-theme-400 shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                    Public Endpoint URL
                  </span>
                  <span className="font-mono text-sm text-theme-300 font-semibold truncate block">
                    {tunnelUrl}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyToClipboard(tunnelUrl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-600/20 hover:bg-theme-600/30 text-theme-300 border border-theme-600/40 rounded-lg text-xs font-mono transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy URL"}</span>
                </button>
                <a
                  href={tunnelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Box */}
        <div className="bg-card/80 border border-border-subtle rounded-2xl p-6 shadow-md">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-theme-400" />
            Tunnel Configuration
          </h2>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div 
              onClick={() => status !== "running" && setMode("quick")}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                mode === "quick" 
                  ? "bg-theme-600/10 border-theme-500 ring-1 ring-theme-500" 
                  : "bg-muted/40 border-border hover:bg-muted/60"
              } ${status === "running" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-foreground">Quick Tunnel</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Instant / Free
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Creates an automatic public endpoint (*.trycloudflare.com). No Cloudflare account required.
              </p>
            </div>

            <div 
              onClick={() => status !== "running" && setMode("token")}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                mode === "token" 
                  ? "bg-theme-600/10 border-theme-500 ring-1 ring-theme-500" 
                  : "bg-muted/40 border-border hover:bg-muted/60"
              } ${status === "running" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-foreground">Zero Trust Token</span>
                <span className="text-[10px] font-mono uppercase bg-theme-500/10 text-theme-400 border border-theme-500/20 px-2 py-0.5 rounded-full">
                  Custom Domain
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connects directly to your Cloudflare Zero Trust account and custom domain via tunnel token.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {mode === "quick" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Target Protocol</label>
                  <select
                    disabled={status === "running"}
                    value={protocol}
                    onChange={(e: any) => setProtocol(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-theme-500 disabled:opacity-50"
                  >
                    <option value="tcp">TCP (Minecraft Java Edition default)</option>
                    <option value="udp">UDP (Minecraft Bedrock Edition)</option>
                    <option value="http">HTTP (Web Maps / APIs / Consoles)</option>
                  </select>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Select TCP for Java Minecraft servers (port 25565).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Target Port</label>
                  <input
                    type="number"
                    disabled={status === "running"}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="25565"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-theme-500 disabled:opacity-50 font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Server's internal listening port (auto-filled with {server?.port || 25565}).
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Cloudflare Tunnel Token</label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    disabled={status === "running"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-background border border-border rounded-xl pl-3 pr-20 py-2.5 text-xs text-foreground focus:outline-none focus:border-theme-500 disabled:opacity-50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1.5 block">
                  Obtained from Cloudflare Zero Trust Dashboard → Networks → Tunnels → Run Tunnel.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Tunnel Logs Console */}
        <div className="bg-zinc-950 border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-theme-400" />
              <span className="text-xs font-mono font-semibold text-zinc-300">Cloudflared Daemon Logs</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Live stream</span>
          </div>
          <div className="p-4 font-mono text-xs text-zinc-300 bg-black/60 max-h-72 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed select-text">
            {logs ? (
              logs
            ) : (
              <span className="text-zinc-600 italic">No active logs. Click "Start Tunnel" to initialize cloudflared.</span>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Informational Tips Card */}
        <div className="bg-theme-950/20 border border-theme-600/20 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-theme-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <HelpCircle size={14} /> Connecting Players with Cloudflare Tunnel
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
            <li>For HTTP/Web traffic (like Dynmap or BlueMap), Quick Tunnel URLs work directly in any browser.</li>
            <li>For Minecraft Java TCP connections using Zero Trust, players can connect via <code className="bg-black/40 px-1.5 py-0.5 rounded text-zinc-300">cloudflared access tcp --hostname yourdomain.com --url localhost:25565</code>, or through Cloudflare Spectrum.</li>
            <li>Cloudflare Tunnels protect your host IP from DDoS attacks without exposing raw open ports to the public internet.</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
