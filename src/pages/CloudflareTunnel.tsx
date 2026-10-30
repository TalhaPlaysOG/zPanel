import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Cloud,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Play,
  Square,
  RotateCw,
  Link2,
  AlertTriangle,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

interface TunnelStatus {
  status: "not-installed" | "not-configured" | "running" | "stopped" | "error";
  installed: boolean;
  binaryPath: string | null;
  serviceInstalled: boolean;
  serviceActive: boolean;
  serviceEnabled: boolean;
  managedProcess: boolean;
  running: boolean;
  connection: "connected" | "connecting" | "disconnected" | "error";
  tokenConfigured: boolean;
  tunnelUrl: string | null;
  lastError: string | null;
  logs: string;
  checkedAt: string;
}

type Notice = { type: "success" | "error" | "info"; message: string } | null;

const statusStyles: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  stopped: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  error: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "not-installed": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "not-configured": "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const statusLabels: Record<string, string> = {
  running: "Running",
  stopped: "Stopped",
  error: "Error",
  "not-installed": "Not Installed",
  "not-configured": "Not Configured",
};

const connectionStyles: Record<string, string> = {
  connected: "text-emerald-300",
  connecting: "text-sky-300",
  disconnected: "text-slate-400",
  error: "text-rose-300",
};

const connectionLabels: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
  error: "Connection Error",
};

export default function CloudflareTunnel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await axios.get<TunnelStatus>("/api/cloudflare/status");
      setStatus(data);
      setNotice((prev) => (prev?.type === "error" ? prev : null));
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to load tunnel status";
      setNotice({ type: "error", message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, isAdmin]);

  useEffect(() => {
    if (!revealedToken) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRevealedToken(null), 60000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [revealedToken]);

  const runAction = async (name: string, fn: () => Promise<any>, successMessage: string) => {
    setAction(name);
    setNotice(null);
    try {
      const response = await fn();
      if (response?.data?.status) setStatus(response.data.status);
      else await fetchStatus(true);
      setNotice({ type: "success", message: successMessage });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Operation failed";
      setNotice({ type: "error", message });
    } finally {
      setAction(null);
    }
  };

  const handleConnect = () => {
    const token = tokenInput.trim();
    runAction(
      "connect",
      () => axios.post("/api/cloudflare/connect", token ? { token } : {}),
      token ? "Tunnel token saved and tunnel started." : "Cloudflare Tunnel started."
    ).then(() => setTokenInput(""));
  };

  const handleUpdateToken = () => {
    const token = tokenInput.trim();
    if (!token) {
      setNotice({ type: "error", message: "Paste a tunnel token or the full cloudflared install command first." });
      return;
    }
    runAction(
      "token",
      () => axios.post("/api/cloudflare/token", { token }),
      "Tunnel token updated and service restarted."
    ).then(() => setTokenInput(""));
  };

  const handleRestart = () =>
    runAction("restart", () => axios.post("/api/cloudflare/restart"), "Cloudflare Tunnel restarted.");

  const handleStop = () =>
    runAction("stop", () => axios.post("/api/cloudflare/stop"), "Cloudflare Tunnel stopped.");

  const toggleReveal = async () => {
    if (revealedToken) {
      setRevealedToken(null);
      return;
    }
    setTokenBusy(true);
    try {
      const { data } = await axios.get("/api/cloudflare/token");
      setRevealedToken(data.token);
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err?.response?.data?.error || err.message || "Failed to read tunnel token",
      });
    } finally {
      setTokenBusy(false);
    }
  };

  const copyToken = async () => {
    setTokenBusy(true);
    try {
      let token = revealedToken;
      if (!token) {
        const { data } = await axios.get("/api/cloudflare/token");
        token = data.token;
      }
      await navigator.clipboard.writeText(token as string);
      setNotice({ type: "success", message: "Tunnel token copied to clipboard." });
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err?.response?.data?.error || err.message || "Failed to copy tunnel token",
      });
    } finally {
      setTokenBusy(false);
    }
  };

  const statusKey = status?.status || "not-configured";
  const statusStyle = statusStyles[statusKey] || statusStyles["not-configured"];
  const connectionKey = status?.connection || "disconnected";
  const connectionStyle = connectionStyles[connectionKey] || connectionStyles.disconnected;

  const logLines = useMemo(() => {
    const raw = status?.logs || "";
    return raw.split(/\r?\n/).filter((line) => line.trim()).slice(-120);
  }, [status?.logs]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cloudflare Tunnel" subtitle="PANEL CONNECTIVITY" />
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-rose-300" />
          <h3 className="text-sm font-semibold text-rose-200">Administrator access required</h3>
          <p className="mt-1 text-xs text-rose-200/70">
            Only admins and owners can view or change the panel Cloudflare Tunnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloudflare Tunnel"
        subtitle="PANEL CONNECTIVITY"
        actions={
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] px-3 py-2 text-xs font-semibold text-[#94a3b8] transition-all hover:border-[rgba(139,92,246,0.35)] hover:text-[#f0f4ff] disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : notice.type === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "border-sky-500/30 bg-sky-500/10 text-sky-200"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : notice.type === "error" ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <Cloud size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="whitespace-pre-wrap break-words">{notice.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.5)] py-16 text-sm text-[#94a3b8]">
          <Loader2 size={18} className="animate-spin" /> Loading tunnel status…
        </div>
      ) : (
        <>
          {/* Status cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-4 shadow-lg backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <Cloud size={14} /> Tunnel
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                  {statusLabels[statusKey] || statusKey}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#f0f4ff]">
                {status?.running ? "Tunnel process active" : "Tunnel process inactive"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {status?.managedProcess ? "Panel-managed process" : status?.serviceInstalled ? "Systemd service" : "No service"}
              </p>
            </div>

            <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-4 shadow-lg backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <ShieldCheck size={14} /> Service
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    status?.serviceActive
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-500/30 bg-slate-500/15 text-slate-300"
                  }`}
                >
                  {status?.serviceActive ? "Running" : status?.serviceInstalled ? "Stopped" : "Not Installed"}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#f0f4ff]">
                {status?.serviceInstalled ? "cloudflared.service" : "cloudflared binary"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {status?.serviceInstalled
                  ? status.serviceEnabled
                    ? "Enabled on boot"
                    : "Auto-start disabled"
                  : status?.installed
                    ? "Binary available"
                    : "Not installed"}
              </p>
            </div>

            <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-4 shadow-lg backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <Link2 size={14} /> Connection
                </span>
                <span className={`text-[11px] font-bold ${connectionStyle}`}>
                  {connectionLabels[connectionKey] || connectionKey}
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-[#f0f4ff]">
                {status?.tunnelUrl ? (
                  <a href={status.tunnelUrl} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">
                    {status.tunnelUrl}
                  </a>
                ) : status?.running ? (
                  "Waiting for Cloudflare edge"
                ) : (
                  "No active connection"
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                Checked {status?.checkedAt ? new Date(status.checkedAt).toLocaleTimeString() : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-4 shadow-lg backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <KeyRound size={14} /> Token
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    status?.tokenConfigured
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {status?.tokenConfigured ? "Configured" : "Missing"}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#f0f4ff]">
                {status?.tokenConfigured ? "Stored securely (mode 600)" : "No token saved"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">Only visible to administrators</p>
            </div>
          </div>

          {status?.lastError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <XCircle size={15} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap break-words">{status.lastError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              {/* Token management */}
              <section className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-5 shadow-lg backdrop-blur-xl sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-600/20 text-[#a78bfa]">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f0f4ff]">Tunnel Token</h3>
                    <p className="text-[11px] text-[#94a3b8]">
                      Paste a token or the full <code className="text-purple-300">cloudflared service install</code> command.
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] px-3 py-2">
                  <Lock size={13} className="text-[#64748b]" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#cbd5e1]">
                    {revealedToken ? revealedToken : status?.tokenConfigured ? "••••••••••••••••••••••••••••••••" : "No token configured"}
                  </span>
                  <button
                    onClick={toggleReveal}
                    disabled={!status?.tokenConfigured || tokenBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.1)] px-2 py-1 text-[11px] font-semibold text-[#c4b5fd] transition hover:bg-[rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {revealedToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    {revealedToken ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={copyToken}
                    disabled={!status?.tokenConfigured || tokenBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.1)] px-2 py-1 text-[11px] font-semibold text-[#c4b5fd] transition hover:bg-[rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>

                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  New token / command
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      type={showTokenInput ? "text" : "password"}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="eyJhIjoi... or sudo cloudflared service install eyJhIjoi..."
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full rounded-xl border border-[rgba(139,92,246,0.25)] bg-[rgba(6,9,26,0.8)] px-3.5 py-2.5 pr-10 font-mono text-xs text-white outline-none transition focus:border-[#8b5cf6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokenInput((v) => !v)}
                      title={showTokenInput ? "Hide token" : "Show token"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#64748b] transition hover:text-[#c4b5fd]"
                    >
                      {showTokenInput ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handleUpdateToken}
                    disabled={!!action || !tokenInput.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === "token" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Update & Reconnect
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#64748b]">
                  The token is written to a protected file on the server and is never returned by the public status API.
                </p>
              </section>

              {/* Logs */}
              <section className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-5 shadow-lg backdrop-blur-xl sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={15} className="text-[#a78bfa]" />
                    <h3 className="text-sm font-bold text-[#f0f4ff]">Tunnel Logs</h3>
                  </div>
                  <span className="font-mono text-[10px] text-[#64748b]">{logLines.length} lines</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto rounded-xl border border-[rgba(139,92,246,0.12)] bg-black/50 p-3 custom-scrollbar">
                  {logLines.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#64748b]">No tunnel logs available yet.</p>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#cbd5e1]">
                      {logLines.join("\n")}
                    </pre>
                  )}
                </div>
              </section>
            </div>

            {/* Controls */}
            <aside className="space-y-4">
              <section className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] p-5 shadow-lg backdrop-blur-xl">
                <h3 className="mb-1 text-sm font-bold text-[#f0f4ff]">Tunnel Controls</h3>
                <p className="mb-4 text-[11px] text-[#94a3b8]">
                  Start, reconnect or stop the panel's Cloudflare Tunnel.
                </p>

                <div className="space-y-2.5">
                  <button
                    onClick={handleConnect}
                    disabled={!!action}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === "connect" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    Connect / Start
                  </button>

                  <button
                    onClick={handleRestart}
                    disabled={!!action || !status?.tokenConfigured}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === "restart" ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                    Reconnect / Restart
                  </button>

                  <button
                    onClick={handleStop}
                    disabled={!!action || !status?.running}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === "stop" ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                    Stop Tunnel
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.5)] p-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  <ShieldCheck size={13} /> Security
                </h3>
                <ul className="space-y-1.5 text-[11px] text-[#94a3b8]">
                  <li>• Token stored with mode 600.</li>
                  <li>• Full token only available to admins.</li>
                  <li>• Token never written to tunnel logs.</li>
                  <li>• Service reuses the existing cloudflared unit.</li>
                </ul>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
