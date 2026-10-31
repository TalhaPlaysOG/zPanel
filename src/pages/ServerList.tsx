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
import { Server, Plus, ChevronRight, Settings, Lock, Trash2, AlertTriangle } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ServerLiveStats from "../components/ServerLiveStats";

type ServerStatus = "online" | "offline" | (string & {});

interface ServerRecord {
  id: string;
  name: string;
  status: ServerStatus;
  owner?: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  version?: string;
  suspended?: boolean;
  description?: string;
  ipAlias?: string;
  port?: number;
}

interface ServersState {
  servers: ServerRecord[];
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
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

  return { servers, error, isLoading, refetch: fetchServers };
}

const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status?: ServerStatus;
}) {
  const online = isOnline(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{
        backgroundColor: online ? "rgba(54, 201, 143, 0.12)" : "rgba(237, 98, 111, 0.12)",
        color: online ? "var(--zp-success)" : "var(--zp-danger)",
        borderColor: online ? "rgba(54, 201, 143, 0.25)" : "rgba(237, 98, 111, 0.25)",
      }}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zp-success opacity-75 motion-reduce:hidden" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-zp-success" : "bg-zp-text-muted"
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
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zp-text-dim">
        {label}
      </p>
      <div className="font-mono text-sm font-semibold text-zp-text-primary">
        {children}
      </div>
    </div>
  );
}

const ServerCard = memo(function ServerCard({
  server,
  canDelete,
  onDelete,
}: {
  server: ServerRecord;
  canDelete: boolean;
  onDelete: (server: ServerRecord) => void;
}) {
  const online = isOnline(server.status);
  const isSuspended = server.suspended;

  const content = (
    <>
      {/* Status top edge light */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${
          online
            ? "bg-gradient-to-r from-transparent via-zp-success/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-zp-primary-500/30 to-transparent"
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zp-primary-500/25 bg-zp-primary-500/10 text-zp-primary-400 shadow-[0_0_16px_-4px_rgba(130,149,255,0.3)] transition-colors group-hover:border-zp-primary-500/45 group-hover:text-white">
            <Server className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base sm:text-lg font-bold tracking-tight text-zp-text-primary group-hover:text-zp-text-primary transition-colors">
              {server.name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={server.status} />
              {isSuspended && (
                <span className="inline-flex items-center gap-1 rounded-md border border-zp-danger/30 bg-zp-danger/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zp-danger uppercase">
                  <Lock className="h-3 w-3" />
                  Suspended
                </span>
              )}
            </div>
          </div>
        </div>
        {!isSuspended && (
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zp-text-muted transition-all group-hover:translate-x-1 group-hover:text-zp-primary-500" />
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3.5 rounded-xl border border-zp-primary-500/10 bg-black/40 px-4 py-3 sm:grid-cols-4">
        <Metric label="CPU Limit">
          {server.cpu ?? DEFAULT_CPU}
          <span className="ml-0.5 text-xs text-zp-text-dim">%</span>
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
          <span className="ml-0.5 text-xs text-zp-text-dim">GB</span>
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
    <motion.article variants={itemVariants} className="relative">
      {canDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(server);
          }}
          title={`Delete ${server.name}`}
          aria-label={`Delete ${server.name}`}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zp-danger/25 bg-zp-danger/10 text-zp-danger/80 transition-all hover:border-zp-danger/50 hover:bg-zp-danger/20 hover:text-zp-danger active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {isSuspended ? (
        <div className="group relative block overflow-hidden rounded-2xl border border-zp-danger/20 bg-black/60 p-5 opacity-70 md:p-6 cursor-not-allowed">
          {content}
        </div>
      ) : (
        <Link
          to={`/servers/${server.id}`}
          className="group relative block overflow-hidden rounded-2xl border border-zp-primary-500/15 bg-zp-card backdrop-blur-xl p-5 transition-all duration-200 hover:border-zp-primary-500/40 hover:bg-zp-card-alt hover:shadow-zp-shadow-card md:p-6"
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
        className="h-10 w-10 animate-spin rounded-full border-2 border-zp-border border-t-zp-primary-500"
        aria-hidden
      />
      <p className="text-sm font-medium text-zp-text-secondary">Loading server fleet…</p>
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div
      variants={itemVariants}
      className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zp-primary-500/20 bg-zp-card px-6 py-20 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zp-primary-500/30 bg-zp-primary-500/10 text-zp-primary-400 shadow-[0_0_24px_-4px_rgba(130,149,255,0.4)]">
        <Server className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-zp-text-primary">
        No server instances deployed
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zp-text-muted">
        You haven&apos;t deployed any game servers yet. Deploy an instance to start managing console, files, and players.
      </p>
      {isAdmin && (
        <Link
          to="/servers/create"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-zp-primary-600 to-zp-primary-700 hover:from-zp-primary-500 hover:to-zp-primary-600 px-5 text-sm font-bold text-white shadow-zp-shadow-glow transition-all active:scale-95"
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
  const { servers, error, isLoading, refetch } = useServers();

  const [deletingServer, setDeletingServer] = useState<ServerRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAuthReady = user !== undefined;
  const isAdmin = isAuthReady && (user?.role === "admin" || user?.role === "owner");
  const hasServers = servers.length > 0;

  const onlineCount = useMemo(
    () => servers.reduce((n, s) => n + (isOnline(s.status) ? 1 : 0), 0),
    [servers],
  );

  const openDelete = useCallback((server: ServerRecord) => {
    setDeletingServer(server);
    setDeleteConfirmText("");
    setDeleteError(null);
  }, []);

  const closeDelete = useCallback(() => {
    if (deleteBusy) return;
    setDeletingServer(null);
    setDeleteConfirmText("");
    setDeleteError(null);
  }, [deleteBusy]);

  const confirmDelete = useCallback(async () => {
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
      await refetch();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || err.message || "Failed to delete server");
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteConfirmText, deletingServer, refetch]);

  if (!isAuthReady || (isLoading && !hasServers)) return <LoadingState />;

  return (
    <div className="relative">
      <div className="relative w-full max-w-full">
        <PageHeader 
          title="Instances" 
          subtitle="INFRASTRUCTURE" 
          actions={
            isAdmin && (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/admin/servers"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-zp-primary-500/20 bg-black/40 text-zp-text-secondary hover:text-zp-text-primary hover:border-zp-primary-500/40 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" /> Manage Fleet
                </Link>
                <Link
                  to="/servers/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-zp-primary-600 to-zp-primary-700 hover:from-zp-primary-500 hover:to-zp-primary-600 text-white shadow-zp-shadow-glow transition-all active:scale-95"
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
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-zp-primary-500/15 text-xs text-zp-text-muted">
              <span className="w-2 h-2 rounded-full bg-zp-success" />
              <strong className="text-zp-text-primary font-mono">{onlineCount}</strong> of <strong className="text-zp-text-primary font-mono">{servers.length}</strong> online
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-zp-danger/30 bg-zp-danger/10 px-4 py-3 text-sm font-medium text-zp-danger/90"
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
              <ServerCard
                key={server.id}
                server={server}
                canDelete={isAdmin || server.owner === user?.id}
                onDelete={openDelete}
              />
            ))
          ) : (
            <EmptyState isAdmin={isAdmin} />
          )}
        </motion.section>
      </div>

      {deletingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zp-danger/40 bg-zp-card p-6 shadow-zp-shadow-card ring-1 ring-zp-danger/20 md:p-8">
            <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-zp-danger-600 to-zp-danger-500" />
            <div className="mb-4 flex items-start">
              <div className="mr-4 shrink-0 rounded-xl bg-zp-danger/20 p-3 text-zp-danger">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-bold text-zp-text-primary">Delete “{deletingServer.name}”?</h3>
                <p className="text-sm leading-relaxed text-zp-text-muted">
                  This permanently deletes the server, all worlds and files, backups, logs, configuration,
                  SFTP access, tunnel settings and database records. The server is stopped first.
                  <strong className="text-zp-danger"> This action cannot be undone.</strong>
                </p>
              </div>
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zp-text-dim">
              Type <span className="font-mono text-zp-danger">{deletingServer.name}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder={deletingServer.name}
              className="w-full rounded-xl border border-zp-danger/30 bg-zp-bg-input px-4 py-2.5 font-mono text-sm text-zp-text-primary outline-none focus:border-zp-primary-500"
            />

            {deleteError && (
              <p className="mt-3 rounded-lg border border-zp-danger/30 bg-zp-danger/10 px-3 py-2 text-xs text-zp-danger/90">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={closeDelete}
                disabled={deleteBusy}
                className="rounded-xl bg-zp-bg-input px-5 py-2.5 font-semibold text-zp-text-secondary transition-all hover:bg-zp-bg-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteBusy || deleteConfirmText.trim() !== String(deletingServer.name || "").trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-zp-danger-600 px-5 py-2.5 font-bold text-white transition-all hover:bg-zp-danger-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                {deleteBusy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
