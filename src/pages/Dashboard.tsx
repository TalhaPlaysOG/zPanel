import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Server, Play, Square, Plus, Cpu, HardDrive, Activity,
  RefreshCw, Terminal, AlertCircle, ArrowRight, Zap,
  Monitor, Globe, Wifi, Shield, Users, Layers, BarChart3, Command
} from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

/* ── Status badge ── */
function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className="zp-badge flex items-center gap-1.5 px-2.5 py-0.5 text-[0.65rem] font-bold"
      style={{
        backgroundColor: online ? "rgba(54, 201, 143, 0.12)" : "rgba(237, 98, 111, 0.12)",
        color: online ? "var(--zp-success)" : "var(--zp-danger)",
        borderColor: online ? "rgba(54, 201, 143, 0.25)" : "rgba(237, 98, 111, 0.25)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: online ? "var(--zp-success)" : "#64748b",
          boxShadow: online ? "0 0 5px rgba(54, 201, 143, 0.6)" : undefined,
        }}
      />
      {online ? "Running" : "Stopped"}
    </span>
  );
}

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  bar,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ElementType;
  bar?: number;
}) {
  return (
    <div className="zp-card relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-zp-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="zp-section-title text-xs">{label}</span>
          <div className="w-8 h-8 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center">
            <Icon size={14} className="text-zp-primary-400" />
          </div>
        </div>
        <div className="text-2xl font-bold text-zp-text-primary leading-tight mb-1">{value}</div>
        {sub && <div className="text-sm text-zp-text-muted">{sub}</div>}
        {bar !== undefined && (
          <div className="mt-3 h-1.5 bg-zp-border rounded-full overflow-hidden">
            <div
              className="zp-progress-bar h-full"
              style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { panelName } = useSettings();
  const { stats, servers, state, refetch } = useDashboardData();

  const totalServers = servers.length;
  const runningServers = servers.filter((s) => s.status === "online").length;
  const stoppedServers = totalServers - runningServers;

  const cpuPercent = stats ? Math.round(stats.cpuUsage) : 0;
  const totalMem = stats?.totalMemory ?? 0;
  const freeMem = stats?.freeMemory ?? 0;
  const totalMemGB = totalMem > 0 ? (totalMem / (1024 * 1024 * 1024)).toFixed(1) : "0";
  const usedMemGB = totalMem > 0
    ? ((totalMem - freeMem) / (1024 * 1024 * 1024)).toFixed(1)
    : "0";
  const memPercent =
    totalMem > 0
      ? Math.round(((totalMem - freeMem) / totalMem) * 100)
      : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-full w-full pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold text-zp-text-primary tracking-tight mb-0.5">
            Overview
          </h1>
          <p className="text-sm text-zp-text-muted">
            System snapshot for <span className="text-zp-text-secondary">{panelName || "zPanel"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="zp-btn-ghost flex items-center gap-2 text-sm font-medium hover:bg-zp-bg-hover hover:text-zp-text-primary transition-all"
          >
            <RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />
            Refresh
          </button>
          {user?.role === "admin" && (
            <Link
              to="/servers/create"
              className="zp-btn-primary flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={14} />
              Deploy Server
            </Link>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {state === "error" && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zp-danger/10 border border-zp-danger/20 text-zp-danger/90 text-sm mb-6">
          <AlertCircle size={16} />
          <span>Failed to sync live statistics. Showing cached state.</span>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Servers"
          value={totalServers}
          icon={Server}
          sub={
            <div className="flex gap-3 text-sm">
              <span className="text-zp-success">● {runningServers} running</span>
              <span className="text-zp-text-dim">● {stoppedServers} stopped</span>
            </div>
          }
        />
        <StatCard
          label="Panel Status"
          value={<span className="text-zp-success">Online</span>}
          icon={Activity}
          sub={
            <div className="text-sm">Process Manager: <span className="font-mono text-zp-primary-400">PM2</span></div>
          }
        />
        <StatCard
          label="Host CPU"
          value={`${cpuPercent}%`}
          icon={Cpu}
          bar={cpuPercent}
        />
        <StatCard
          label="Host Memory"
          value={`${usedMemGB} GB`}
          icon={HardDrive}
          sub={`of ${totalMemGB} GB total`}
          bar={memPercent}
        />
      </div>

      {/* ── Servers Section ── */}
      <div className="zp-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zp-border">
          <div>
            <h2 className="text-sm font-bold text-zp-text-primary">Instances</h2>
            <p className="text-xs text-zp-text-muted">Configured game servers on this panel</p>
          </div>
          <Link
            to="/servers"
            className="zp-btn-ghost text-xs font-medium hover:bg-zp-bg-hover transition-colors"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {servers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Server size={40} className="mx-auto mb-3 text-zp-text-dim" />
            <h3 className="text-sm font-bold text-zp-text-secondary mb-1">No servers deployed</h3>
            <p className="text-xs text-zp-text-muted mb-4">
              Get started by deploying your first server instance.
            </p>
            {user?.role === "admin" && (
              <Link
                to="/servers/create"
                className="zp-btn-primary flex items-center justify-center gap-2 w-full max-w-xs mx-auto text-sm font-medium"
              >
                <Plus size={14} /> Deploy Server
              </Link>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {servers.slice(0, 12).map((srv) => {
                const online = srv.status === "online";
                return (
                  <Link
                    key={srv.id}
                    to={`/servers/${srv.id}`}
                    className="zp-card-lift zp-card flex flex-col h-48 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-zp-bg-input border border-zp-border flex items-center justify-center">
                        <Monitor size={14} className="text-zp-text-muted" />
                      </div>
                      <StatusBadge online={online} />
                    </div>
                    <h3 className="text-sm font-bold text-zp-text-primary truncate mb-1">{srv.name}</h3>
                    <p className="text-xs text-zp-text-muted truncate mb-3">
                      {`${srv.type || "minecraft"} ${srv.version || "latest"} server`}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-zp-text-dim">
                        <Globe size={10} /> {srv.ipAlias || "127.0.0.1"}:{srv.port}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-zp-text-dim">
                        <HardDrive size={10} /> {srv.ram} GB
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {servers.length > 12 && (
              <div className="px-6 py-4 text-center">
                <Link
                  to="/servers"
                  className="zp-btn-ghost text-xs font-medium hover:bg-zp-bg-hover transition-colors"
                >
                  View all {servers.length} servers <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
