import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Terminal as XTerm,
  Cpu,
  MemoryStick,
  HardDrive,
  Send,
  Sparkles,
  ArrowDownCircle,
  Clock,
  Play,
  Trash2,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

interface ServerStats {
  cpu: number;
  ram: number;
  disk: number;
  limitRam: number;
  limitCpu: number;
  limitDisk: number;
  isRunning?: boolean;
  status?: string;
  startedAt?: string | null;
  uptimeSeconds?: number;
}

interface ServerConsoleProps {
  serverId: string;
  server?: {
    name?: string;
    version?: string;
    type?: string;
    port?: number;
    ipAlias?: string;
    status?: string;
    startedAt?: string | null;
    [key: string]: unknown;
  };
}

const MAX_LOG_LINES = 400;
const STATS_POLL_MS = 2000;
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const DEFAULT_STATS: ServerStats = {
  cpu: 0,
  ram: 0,
  disk: 0,
  limitRam: 2048,
  limitCpu: 100,
  limitDisk: 10,
};

const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "00:00:00";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hhmmss = [hours, minutes, seconds].map((x) => String(x).padStart(2, "0")).join(":");
  if (days > 0) {
    return `${days}d ${hhmmss}`;
  }
  return hhmmss;
}

function formatHumanDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatStartTime(isoString?: string | null): { short: string; full: string } {
  if (!isoString) return { short: "Not Running", full: "Server is currently offline" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { short: "Not Running", full: "Unknown start time" };
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (isToday) {
    return {
      short: `Today at ${timeStr}`,
      full: `Started today at ${d.toLocaleTimeString()} (${d.toLocaleDateString()})`
    };
  }
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return {
    short: `${dateStr}, ${timeStr}`,
    full: `Started on ${d.toLocaleString()}`
  };
}

function FormattedNumber({ value, dec = 0 }: { value: number; dec?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    const duration = 400;
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        prev.current = to;
      }
    };
    requestAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums font-mono">{display.toFixed(dec)}</span>;
}

export default function ServerConsole({ serverId, server }: ServerConsoleProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [cmdHist, setCmdHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [stats, setStats] = useState<ServerStats>(DEFAULT_STATS);
  const [autoScroll, setAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [startedAt, setStartedAt] = useState<string | null>(server?.startedAt || null);
  const [status, setStatus] = useState<string>(server?.status || "offline");
  const [uptime, setUptime] = useState("00:00:00");
  const [uptimeHuman, setUptimeHuman] = useState("0s");

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sockRef = useRef<Socket | null>(null);
  const autoScrollRef = useRef(autoScroll);
  const { token } = useAuth();

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  useEffect(() => {
    if (server?.startedAt !== undefined) {
      setStartedAt(server.startedAt);
    }
    if (server?.status) {
      setStatus(server.status);
    }
  }, [server?.startedAt, server?.status]);

  useEffect(() => {
    const updateTicker = () => {
      const isOnline = status === "online";
      if (!isOnline || !startedAt) {
        setUptime("00:00:00");
        setUptimeHuman("0s");
        return;
      }
      const startMs = new Date(startedAt).getTime();
      if (isNaN(startMs) || startMs <= 0) {
        setUptime("00:00:00");
        setUptimeHuman("0s");
        return;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setUptime(formatDuration(elapsed));
      setUptimeHuman(formatHumanDuration(elapsed));
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  useEffect(() => {
    if (!token || !serverId) return;

    let disposed = false;
    const socket: Socket = io({
      auth: { token },
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 4000,
    });
    sockRef.current = socket;

    const pushSystem = (message: string) => {
      if (disposed) return;
      setLogs((prev) => {
        if (prev[prev.length - 1] === message) return prev;
        const next = [...prev, message];
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
      });
    };

    const appendIncoming = (incoming: string[]) => {
      if (disposed || incoming.length === 0) return;
      setLogs((prev) => {
        const next = [...prev, ...incoming];
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
      });
      if (!autoScrollRef.current) {
        setUnreadCount((c) => c + incoming.length);
      }
    };

    socket.on("connect", () => {
      socket.emit("joinServer", serverId, (response: any) => {
        if (response && response.success === false) {
          pushSystem(`[System] ${response.error || "Unable to join server console."}`);
        } else {
          pushSystem("[System] Live terminal session established.");
        }
      });
    });

    socket.on("connect_error", (err: Error) => {
      pushSystem(`[System] Connection error: ${err.message}`);
    });

    socket.on("logs_history", (payload: any) => {
      const incoming = Array.isArray(payload?.logs)
        ? payload.logs.filter(
            (line: any) => typeof line === "string" && line.trim()
          )
        : [];
      if (disposed) return;
      setLogs((prev) => {
        if (incoming.length === 0) return prev;
        const systemOnly = prev.every((line) => line.startsWith("[System]"));
        const merged = systemOnly ? [...incoming, ...prev] : incoming;
        return merged.slice(-MAX_LOG_LINES);
      });
      setUnreadCount(0);
    });

    socket.on("log", (data: string) => {
      if (typeof data !== "string") return;
      const lines = data
        .split(/\r?\n/)
        .map(stripAnsi)
        .filter((l) => l.trim());
      appendIncoming(lines);
    });

    socket.on("server_status", (payload: any) => {
      if (!payload || (payload.id && payload.id !== serverId)) return;
      if (payload.status) setStatus(payload.status);
      setStartedAt(payload.startedAt ?? null);
      if (payload.error) {
        pushSystem(`[Error] ${payload.error}`);
      }
    });

    socket.on("server_deleted", (payload: any) => {
      if (payload?.id && payload.id !== serverId) return;
      pushSystem("[System] This server has been deleted.");
      setStatus("offline");
      setStartedAt(null);
    });

    socket.on("clear_logs", () => {
      if (!disposed) {
        setLogs([]);
        setUnreadCount(0);
      }
    });

    socket.on("disconnect", (reason: string) => {
      pushSystem(`[System] Terminal disconnected: ${reason}`);
    });

    return () => {
      disposed = true;
      socket.emit("leaveServer", serverId);
      socket.removeAllListeners();
      socket.disconnect();
      if (sockRef.current === socket) sockRef.current = null;
    };
  }, [serverId, token]);

  useEffect(() => {
    if (!serverId) return;
    let alive = true;
    axios
      .get(`/api/servers/${serverId}/logs`, { params: { lines: 300 } })
      .then(({ data }) => {
        if (!alive) return;
        const incoming = Array.isArray(data?.logs)
          ? data.logs.filter(
              (line: any) => typeof line === "string" && line.trim()
            )
          : [];
        if (incoming.length === 0) return;
        setLogs((prev) => (prev.length > 0 ? prev : incoming.slice(-MAX_LOG_LINES)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;
    let alive = true;
    const fetchStats = async () => {
      try {
        const { data } = await axios.get<ServerStats>(`/api/servers/${serverId}/stats`);
        if (alive && data) {
          setStats((prev) => ({
            cpu: data.cpu ?? prev.cpu,
            ram: data.ram ?? prev.ram,
            disk: data.disk ?? prev.disk,
            limitRam: data.limitRam ?? prev.limitRam,
            limitCpu: data.limitCpu ?? prev.limitCpu,
            limitDisk: data.limitDisk ?? prev.limitDisk,
          }));
          if (data.status) {
            setStatus(data.status);
          }
          if (data.startedAt !== undefined) {
            setStartedAt(data.startedAt);
          }
        }
      } catch {
        /* quiet fallback */
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, STATS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [serverId]);

  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [logs, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isClose = distanceToBottom < 40;
    setAutoScroll(isClose);
    if (isClose) setUnreadCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      setAutoScroll(true);
      setUnreadCount(0);
    }
  }, []);

  const clearConsole = useCallback(() => {
    setLogs([]);
    setUnreadCount(0);
  }, []);

  const sendCommand = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const cmd = command.trim();
      if (!cmd) return;

      setCommand("");
      setCmdHist((h) => [cmd, ...h.filter((item) => item !== cmd)].slice(0, 50));
      setHistIdx(-1);
      setLogs((p) => [...p, `> ${cmd}`]);

      const socket = sockRef.current;
      if (socket && socket.connected) {
        const response = await new Promise<any>((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve({ success: false, error: "Command timed out." });
          }, 5000);
          socket.emit("command", { serverId, command: cmd }, (result: any) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result || { success: false, error: "No response from server." });
          });
        });

        if (!response.success) {
          setLogs((p) => [...p, `[Error] ${response.error || "Command failed."}`]);
        }
        return;
      }

      try {
        await axios.post(`/api/servers/${serverId}/command`, { command: cmd });
      } catch (err: any) {
        const message = err?.response?.data?.error || err.message;
        setLogs((p) => [...p, `[Error] Command failed: ${message}`]);
      }
    },
    [command, serverId]
  );

  const fillQuickCommand = (cmd: string) => {
    setCommand(cmd);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = Math.min(i + 1, cmdHist.length - 1);
          if (cmdHist[next]) setCommand(cmdHist[next]);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = i - 1;
          if (next < 0) {
            setCommand("");
            return -1;
          }
          setCommand(cmdHist[next]);
          return next;
        });
      }
    },
    [cmdHist]
  );

  const cpuPct = useMemo(() => Math.min((stats.cpu / (stats.limitCpu || 100)) * 100, 100), [stats.cpu, stats.limitCpu]);
  const ramPct = useMemo(() => Math.min((stats.ram / (stats.limitRam || 2048)) * 100, 100), [stats.ram, stats.limitRam]);
  const diskPct = useMemo(() => Math.min((stats.disk / (stats.limitDisk || 10)) * 100, 100), [stats.disk, stats.limitDisk]);

  const isOnline = status === "online";
  const startInfo = formatStartTime(startedAt);
  const statusMeta: Record<string, { label: string; dotClass: string; boxClass: string; dotColor: string }> = {
    online: { label: "Online", dotClass: "bg-zp-success", boxClass: "bg-zp-success/10 border-zp-success/20 text-zp-success", dotColor: "var(--zp-success)" },
    starting: { label: "Starting", dotClass: "bg-zp-warning animate-pulse", boxClass: "bg-zp-warning/10 border-zp-warning/20 text-zp-warning", dotColor: "var(--zp-warning)" },
    downloading: { label: "Downloading", dotClass: "bg-zp-info animate-pulse", boxClass: "bg-zp-info/10 border-zp-info/20 text-zp-info", dotColor: "var(--zp-info)" },
    stopping: { label: "Stopping", dotClass: "bg-zp-warning animate-pulse", boxClass: "bg-zp-warning/10 border-zp-warning/20 text-zp-warning", dotColor: "var(--zp-warning)" },
    error: { label: "Error", dotClass: "bg-zp-danger", boxClass: "bg-zp-danger/10 border-zp-danger/20 text-zp-danger", dotColor: "var(--zp-danger)" },
    offline: { label: "Offline", dotClass: "bg-zp-text-dim", boxClass: "bg-zp-border/10 border-zp-border text-zp-text-dim", dotColor: "var(--zp-text-dim)" },
  };
  const statusInfo = statusMeta[status] || statusMeta.offline;

  const renderLogLine = (raw: string, index: number) => {
    const clean = stripAnsi(raw);

    if (clean.startsWith(">") || clean.startsWith("$ ")) {
      const spaceIdx = clean.indexOf(" ");
      const promptChar = spaceIdx !== -1 ? clean.slice(0, spaceIdx + 1) : clean.slice(0, 1) + " ";
      const cmdBody = spaceIdx !== -1 ? clean.slice(spaceIdx + 1) : clean.slice(1);
      return (
        <div key={index} className="break-words whitespace-pre-wrap hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors flex items-start gap-1">
          <span className="text-zp-primary-400 font-mono font-bold select-none">{promptChar}</span>
          <span className="text-white font-mono font-semibold">{cmdBody}</span>
        </div>
      );
    }

    if (clean.startsWith("[System]") || clean.startsWith("[System ") || clean.startsWith("[CONSOLE]")) {
      const endBracketIdx = clean.indexOf("]");
      const tag = clean.slice(0, endBracketIdx + 1);
      const msg = clean.slice(endBracketIdx + 1);
      return (
        <div key={index} className="break-words whitespace-pre-wrap hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors">
          <span className="text-zp-primary-400 font-mono font-bold mr-1.5 select-none">{tag}</span>
          <span className="text-white font-mono font-normal">{msg}</span>
        </div>
      );
    }

    const mcMatch = clean.match(/^(\[[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\s+[A-Z]+)?\](?:\s+\[[^\]]+\])?:?)(.*)$/);
    if (mcMatch) {
      const header = mcMatch[1];
      const body = mcMatch[2];
      const isError = /ERROR|Exception|FATAL|Severe/i.test(header) || /ERROR|Exception|FATAL|Severe/i.test(body);
      const isWarn = /WARN|Warning/i.test(header) || /WARN|Warning/i.test(body);

      let headerClass = "text-zp-primary-400 font-mono font-semibold";
      let lineBg = "hover:bg-white/[0.03]";
      if (isError) {
        headerClass = "text-zp-danger font-mono font-bold";
        lineBg = "bg-zp-danger/[0.07] hover:bg-zp-danger/[0.14]";
      } else if (isWarn) {
        headerClass = "text-zp-warning font-mono font-bold";
        lineBg = "bg-zp-warning/[0.07] hover:bg-zp-warning/[0.14]";
      }

      return (
        <div key={index} className={`break-words whitespace-pre-wrap px-1.5 py-0.5 rounded transition-colors ${lineBg}`}>
          <span className={`${headerClass} mr-1.5 select-none`}>{header}</span>
          <span className="text-white font-mono font-normal">{body}</span>
        </div>
      );
    }

    const isError = /ERROR|Exception|FATAL|Severe/i.test(clean);
    const isWarn = /WARN|Warning/i.test(clean);

    if (isError) {
      return (
        <div key={index} className="break-words whitespace-pre-wrap bg-zp-danger/[0.07] hover:bg-zp-danger/[0.14] px-1.5 py-0.5 rounded transition-colors text-white font-mono font-normal">
          <span className="text-zp-danger font-bold mr-1.5">[ERROR]</span>
          <span>{clean}</span>
        </div>
      );
    }

    if (isWarn) {
      return (
        <div key={index} className="break-words whitespace-pre-wrap bg-zp-warning/[0.07] hover:bg-zp-warning/[0.14] px-1.5 py-0.5 rounded transition-colors text-white font-mono font-normal">
          <span className="text-zp-warning font-bold mr-1.5">[WARN]</span>
          <span>{clean}</span>
        </div>
      );
    }

    return (
      <div key={index} className="break-words whitespace-pre-wrap text-white font-mono font-normal hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors">
        {clean}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-2 sm:p-4 min-h-[550px] font-sans">
      <div className="flex-1 flex flex-col zp-card rounded-xl border border-zp-border shadow-zp-shadow-card overflow-hidden relative">
        
        {/* CONSOLE HEADER WITH LIVE UPTIME AND START TIME */}
        <div className="px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-zp-border bg-zp-bg-input/50 backdrop-blur-md">
          {/* Left: Terminal Identity, Start Timestamp and Live Uptime */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-zp-primary-500/30 bg-zp-primary-500/10 flex items-center justify-center text-zp-primary-400 shrink-0 shadow-[0_0_12px_rgba(130,149,255,0.2)]">
              <XTerm className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs sm:text-sm font-bold text-zp-text-primary tracking-wide truncate">
                  {server?.name || "Server Terminal"}
                </span>
                <span className="hidden sm:inline-block font-mono text-[11px] text-zp-text-muted/80">
                  ({server?.version || "Minecraft"})
                </span>
              </div>

              {/* Live Uptime and Start Time Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zp-text-muted font-mono text-[10px] sm:text-[11px] mt-0.5">
                {isOnline ? (
                  <>
                    <div 
                      className="flex items-center gap-1.5 text-zp-success font-semibold cursor-help transition-colors hover:text-zp-success/80"
                      title={`Elapsed Uptime: ${uptimeHuman} (${uptime})`}
                    >
                      <Clock className="w-3.5 h-3.5 text-zp-success animate-pulse shrink-0" />
                      <span>Uptime: {uptime}</span>
                      <span className="text-zp-success/80 font-normal hidden sm:inline">({uptimeHuman})</span>
                    </div>
                    <span className="text-zp-border hidden xs:inline">•</span>
                    <div 
                      className="flex items-center gap-1 text-zp-text-muted cursor-help transition-colors hover:text-zp-text-secondary"
                      title={startInfo.full}
                    >
                      <Play className="w-3 h-3 text-zp-text-muted fill-zp-text-muted shrink-0" />
                      <span>Started: <strong className="font-medium text-zp-text-secondary">{startInfo.short}</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-zp-text-dim">
                    <Clock className="w-3.5 h-3.5 text-zp-text-dim shrink-0" />
                    <span>Uptime: 00:00:00 ({statusInfo.label})</span>
                  </div>
                )}

                {server?.port && (
                  <>
                    <span className="text-zp-border hidden sm:inline">•</span>
                    <span className="text-zp-text-muted font-mono hidden sm:inline">
                      :{server.port}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Clean Terminal Status & Clear Buffer */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono text-[11px] ${statusInfo.boxClass}`}
              title={isOnline ? startInfo.full : statusInfo.label}
            >
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zp-primary-500 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotClass}`}></span>
              </span>
              <span className="font-bold text-zp-text-primary">{statusInfo.label}</span>
              {isOnline && <span className="text-zp-text-muted/80 text-[10px] hidden xs:inline">• {uptime}</span>}
            </div>

            <button
              onClick={clearConsole}
              title="Clear terminal buffer"
              className="p-1.5 rounded-lg bg-zp-primary-500/10 hover:bg-zp-primary-500/20 border border-zp-primary-500/20 text-zp-primary-400 hover:text-zp-primary-300 transition-all text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TERMINAL LOG BUFFER VIEWPORT */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 font-mono text-[13px] sm:text-[14px] leading-relaxed bg-black/40 backdrop-blur-md custom-scrollbar select-text space-y-1"
          role="log"
        >
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zp-text-muted">
              <XTerm className="w-10 h-10 opacity-30 mb-3 text-zp-primary-400" />
              <p className="font-mono text-sm font-semibold text-zp-text-primary">Terminal Ready</p>
              <p className="text-xs text-zp-text-muted mt-1 max-w-sm">
                {isOnline 
                  ? `Server is online since ${startInfo.short}. Listening for output...` 
                  : "Server is offline. Start the server to stream logs and commands."}
              </p>
            </div>
          )}

          {logs.map((raw, index) => renderLogLine(raw, index))}
        </div>

        {/* RESUME TAIL FLOATING BUTTON */}
        {!autoScroll && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-40 right-6 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zp-primary-600 text-white font-mono font-bold text-xs sm:text-sm shadow-zp-shadow-glow hover:bg-zp-primary-500 transition-all"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Bottom</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px]">
                +{unreadCount}
              </span>
            )}
          </button>
        )}

        {/* QUICK COMMANDS SECTION */}
        <div className="px-3.5 sm:px-4 py-2.5 border-t border-zp-border bg-black/40 backdrop-blur-md flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-zp-text-muted shrink-0 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-zp-primary-400" /> Quick:
          </span>
          {[
            { cmd: "list", label: "list" },
            { cmd: "tps", label: "tps" },
            { cmd: "save-all", label: "save-all" },
            { cmd: "whitelist list", label: "whitelist" },
            { cmd: "gamerule keepInventory true", label: "keepInventory" },
            { cmd: "reload confirm", label: "reload" },
            { cmd: "stop", label: "stop" },
          ].map((q) => (
            <button
              key={q.cmd}
              onClick={() => fillQuickCommand(q.cmd)}
              className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl bg-zp-primary-500/10 border border-zp-primary-500/20 text-zp-primary-400 hover:text-zp-primary-300 hover:border-zp-primary-500 hover:bg-zp-primary-500/20 font-mono text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* NEAT & CLEAN COMMAND TYPE BAR */}
        <form onSubmit={sendCommand} className="p-2.5 sm:p-3.5 border-t border-zp-border bg-black/60 backdrop-blur-xl flex gap-2.5 items-center">
          <div className="flex-1 min-h-[46px] flex items-center rounded-xl border border-zp-primary-500/20 bg-zp-bg-input px-3.5 py-1.5 focus-within:border-zp-primary-500/80 focus-within:ring-2 focus-within:ring-zp-primary-500/30 transition-all">
            <span className="text-zp-primary-400 font-mono text-base font-bold mr-2.5 select-none shrink-0">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={isOnline ? "Enter server command..." : `Server is ${statusInfo.label.toLowerCase()} — start it to send commands`}
              spellCheck="false"
              autoComplete="off"
              className="w-full bg-transparent py-1 text-sm sm:text-base font-mono text-zp-text-primary focus:outline-none placeholder:text-zp-text-muted/40 caret-zp-primary-400"
            />
          </div>
          <button
            type="submit"
            disabled={!command.trim() || !isOnline}
            className="min-h-[46px] px-5 sm:px-6 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-zp-primary-600 to-zp-primary-700 hover:from-zp-primary-500 hover:to-zp-primary-600 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-zp-shadow-glow shrink-0 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        {/* VITALS DOCK AT THE BOTTOM OF THE CONSOLE */}
        <div className="border-t border-zp-border bg-black/40 backdrop-blur-md p-3 sm:p-3.5">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            
            {/* CPU VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-zp-primary-500/[0.03] border border-zp-primary-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-zp-primary-400">
                  <Cpu className="w-3.5 h-3.5 text-zp-primary-400" />
                  <span>CPU</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">
                  <FormattedNumber value={stats.cpu} dec={1} />%
                </span>
              </div>
              <div className="w-full bg-zp-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zp-primary-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${cpuPct}%` }}
                />
              </div>
            </div>

            {/* RAM VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-zp-primary-500/[0.03] border border-zp-primary-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-zp-primary-400">
                  <MemoryStick className="w-3.5 h-3.5 text-zp-primary-400" />
                  <span>RAM</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white truncate">
                  <FormattedNumber value={stats.ram} dec={0} />
                  <span className="text-[10px] text-zp-primary-400/80 ml-0.5">/{stats.limitRam || 2048}M</span>
                </span>
              </div>
              <div className="w-full bg-zp-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zp-primary-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${ramPct}%` }}
                />
              </div>
            </div>

            {/* DISK VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-zp-primary-500/[0.03] border border-zp-primary-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-zp-primary-400">
                  <HardDrive className="w-3.5 h-3.5 text-zp-primary-400" />
                  <span>Disk</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white truncate">
                  <FormattedNumber value={stats.disk} dec={1} />
                  <span className="text-[10px] text-zp-primary-400/80 ml-0.5">/{stats.limitDisk || 10}G</span>
                </span>
              </div>
              <div className="w-full bg-zp-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zp-primary-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${diskPct}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
