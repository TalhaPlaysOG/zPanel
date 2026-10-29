// @ts-nocheck
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Server, Plus, ChevronRight, Settings, Lock } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ServerLiveStats from "../components/ServerLiveStats";

type ServerStatus = "online" | "offline" | (string & {});

interface ServerRecord {
  id: string;
  name: string;
  status: ServerStatus;
  cpu?: number;
  ram?: number;
  disk?: number;
  version?: string;
  suspended?: boolean;
}

interface ServersState {
  servers: ServerRecord[];
  error: string | null;
  isLoading: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const POLL_INTERVAL_MS = 5_000;
const DEFAULT_CPU = 100;
const DEFAULT_DISK = 10;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const isOnline = (status?: ServerStatus): boolean => status === "online";

function useServers(pollIntervalMs = POLL_INTERVAL_MS): ServersState {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServers = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await axios.get<ServerRecord[]>("/api/servers", { signal });
      setServers(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError("Unable to load servers. Retrying…");
      console.error("Failed to fetch servers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchServers(controller.signal);
    const interval = window.setInterval(
      () => void fetchServers(controller.signal),
      pollIntervalMs,
    );
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fetchServers, pollIntervalMs]);

  return { servers, error, isLoading };
}

const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status?: ServerStatus;
}) {
  const online = isOnline(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
        online
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]"
          : "bg-slate-800/60 text-[#94a3b8] border border-[rgba(139,92,246,0.15)]"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-emerald-400" : "bg-slate-500"
          }`}
        />
      </span>
      {online ? "Online" : "Offline"}
    </span>
  );
});

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
        {label}
      </p>
      <div className="font-mono text-sm font-semibold text-[#f0f4ff]">
        {children}
      </div>
    </div>
  );
}

const ServerCard = memo(function ServerCard({
  server,
}: {
  server: ServerRecord;
}) {
  const online = isOnline(server.status);
  const isSuspended = server.suspended;

  const content = (
    <>
      {/* Status top edge light */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${
          online
            ? "bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(139,92,246,0.25)] bg-[rgba(124,58,237,0.12)] text-[#a78bfa] shadow-[0_0_16px_-4px_rgba(124,58,237,0.3)] transition-colors group-hover:border-[rgba(139,92,246,0.45)] group-hover:text-white">
            <Server className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base sm:text-lg font-bold tracking-tight text-[#f0f4ff] group-hover:text-white transition-colors">
              {server.name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={server.status} />
              {isSuspended && (
                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-400 uppercase">
                  <Lock className="h-3 w-3" />
                  Suspended
                </span>
              )}
            </div>
          </div>
        </div>
        {!isSuspended && (
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#64748b] transition-all group-hover:translate-x-1 group-hover:text-[#a78bfa]" />
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3.5 rounded-xl border border-[rgba(139,92,246,0.12)] bg-[rgba(6,9,26,0.6)] px-4 py-3 sm:grid-cols-4">
        <Metric label="CPU Limit">
          {server.cpu ?? DEFAULT_CPU}
          <span className="ml-0.5 text-xs text-[#64748b]">%</span>
        </Metric>
        <Metric label="RAM Usage">
          <ServerLiveStats
            serverId={server.id}
            limitRam={server.ram}
            status={server.status}
          />
        </Metric>
        <Metric label="Disk Limit">
          {server.disk ?? DEFAULT_DISK}
          <span className="ml-0.5 text-xs text-[#64748b]">GB</span>
        </Metric>
        <Metric label="Version">
          <span className="block truncate" title={server.version}>
            {server.version ?? "—"}
          </span>
        </Metric>
      </div>
    </>
  );

  return (
    <motion.article variants={itemVariants}>
      {isSuspended ? (
        <div className="group relative block overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.2)] bg-[rgba(10,14,36,0.7)] p-5 opacity-70 md:p-6 cursor-not-allowed">
          {content}
        </div>
      ) : (
        <Link
          to={`/servers/${server.id}`}
          className="group relative block overflow-hidden rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.65)] backdrop-blur-xl p-5 transition-all duration-200 hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(15,21,53,0.85)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6),0_0_25px_-5px_rgba(124,58,237,0.25)] md:p-6"
        >
          {content}
        </Link>
      )}
    </motion.article>
  );
});

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(139,92,246,0.2)] border-t-[#8b5cf6]"
        aria-hidden
      />
      <p className="text-sm font-medium text-[#94a3b8]">Loading server fleet…</p>
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div
      variants={itemVariants}
      className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(139,92,246,0.2)] bg-[rgba(10,14,36,0.6)] px-6 py-20 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(139,92,246,0.3)] bg-[rgba(124,58,237,0.12)] text-[#a78bfa] shadow-[0_0_24px_-4px_rgba(124,58,237,0.4)]">
        <Server className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-[#f0f4ff]">
        No server instances deployed
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[#94a3b8]">
        You haven&apos;t deployed any game servers yet. Deploy an instance to start managing console, files, and players.
      </p>
      {isAdmin && (
        <Link
          to="/servers/create"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-5 text-sm font-bold text-white shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)] transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Deploy First Server
        </Link>
      )}
    </motion.div>
  );
}

export default function ServerList() {
  const { user } = useAuth();
  const { servers, error, isLoading } = useServers();

  const isAuthReady = user !== undefined;
  const isAdmin = isAuthReady && (user?.role === "admin" || user?.role === "owner");
  const hasServers = servers.length > 0;

  const onlineCount = useMemo(
    () => servers.reduce((n, s) => n + (isOnline(s.status) ? 1 : 0), 0),
    [servers],
  );

  if (!isAuthReady || (isLoading && !hasServers)) return <LoadingState />;

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-7xl">
        <PageHeader 
          title="Instances" 
          subtitle="INFRASTRUCTURE" 
          actions={
            isAdmin && (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/admin/servers"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[rgba(139,92,246,0.22)] bg-[rgba(6,9,26,0.6)] text-[#94a3b8] hover:text-[#f0f4ff] hover:border-[rgba(139,92,246,0.4)] transition-all"
                >
                  <Settings className="w-3.5 h-3.5" /> Manage Fleet
                </Link>
                <Link
                  to="/servers/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)] transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> New Instance
                </Link>
              </div>
            )
          }
        />

        {/* Online summary pill */}
        {hasServers && (
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[rgba(10,14,36,0.7)] border border-[rgba(139,92,246,0.18)] text-xs text-[#94a3b8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong className="text-[#f0f4ff] font-mono">{onlineCount}</strong> of <strong className="text-[#f0f4ff] font-mono">{servers.length}</strong> online
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300"
          >
            {error}
          </div>
        )}

        {/* Fleet Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4"
          aria-label="Server instances"
        >
          {hasServers ? (
            servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))
          ) : (
            <EmptyState isAdmin={isAdmin} />
          )}
        </motion.section>
      </div>
    </div>
  );
}
