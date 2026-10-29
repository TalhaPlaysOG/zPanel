import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Server, Play, Square, Plus, Cpu, HardDrive, Activity, RefreshCw, Terminal, AlertCircle } from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { panelName } = useSettings();
  const { stats, servers, state, refetch } = useDashboardData();

  const totalServers = servers.length;
  const runningServers = servers.filter((s) => s.status === "online").length;
  const stoppedServers = totalServers - runningServers;

  const cpuPercent = stats ? Math.round(stats.cpuUsage) : 0;
  const totalMemGB = stats ? (stats.totalMemory / (1024 * 1024 * 1024)).toFixed(1) : "0";
  const freeMemGB = stats ? (stats.freeMemory / (1024 * 1024 * 1024)).toFixed(1) : "0";
  const usedMemGB = stats
    ? ((stats.totalMemory - stats.freeMemory) / (1024 * 1024 * 1024)).toFixed(1)
    : "0";
  const memPercent = stats && stats.totalMemory > 0
    ? Math.round(((stats.totalMemory - stats.freeMemory) / stats.totalMemory) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            System overview and running instances for {panelName || "zPanel"}.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          {user?.role === "admin" && (
            <Link
              to="/servers/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-theme-600 hover:bg-theme-500 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={15} />
              <span>Deploy Server</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error notification if server fetch failed */}
      {state === "error" && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>Failed to synchronize live statistics. Showing cached or local state.</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Servers */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Servers</span>
            <Server size={17} className="text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalServers}</span>
            <span className="text-xs text-zinc-400">instances</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {runningServers} running
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              {stoppedServers} stopped
            </span>
          </div>
        </div>

        {/* Panel Status */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Panel Status</span>
            <Activity size={17} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">Online</span>
            <span className="text-xs text-zinc-400">Port 6767</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Process Manager: <span className="text-zinc-300 font-mono">PM2</span>
          </div>
        </div>

        {/* CPU Usage */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Host CPU</span>
            <Cpu size={17} className="text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{cpuPercent}%</span>
            <span className="text-xs text-zinc-400">utilized</span>
          </div>
          <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                cpuPercent > 80 ? "bg-rose-500" : cpuPercent > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, cpuPercent))}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Host Memory</span>
            <HardDrive size={17} className="text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{usedMemGB} GB</span>
            <span className="text-xs text-zinc-400">/ {totalMemGB} GB</span>
          </div>
          <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                memPercent > 85 ? "bg-rose-500" : memPercent > 65 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Servers Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Instances</h2>
            <p className="text-xs text-zinc-400">Overview of configured Minecraft and game servers.</p>
          </div>
          <Link
            to="/servers"
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            View all →
          </Link>
        </div>

        {servers.length === 0 ? (
          <div className="p-8 text-center">
            <Server size={32} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-zinc-300">No servers deployed</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Get started by creating your first server instance.
            </p>
            {user?.role === "admin" && (
              <Link
                to="/servers/create"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-theme-600 hover:bg-theme-500 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Deploy Server
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {servers.slice(0, 8).map((srv) => {
              const isOnline = srv.status === "online";
              return (
                <div
                  key={srv.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOnline ? "bg-emerald-400" : "bg-zinc-600"
                      }`}
                    />
                    <div className="min-w-0 truncate">
                      <Link
                        to={`/servers/${srv.id}`}
                        className="text-sm font-semibold text-white hover:text-theme-400 transition-colors truncate block"
                      >
                        {srv.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-400">Port {srv.port}</span>
                        <span>•</span>
                        <span className="capitalize">{srv.type || "Minecraft"}</span>
                        <span>•</span>
                        <span>{srv.ram} GB RAM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                      }`}
                    >
                      {isOnline ? "Running" : "Stopped"}
                    </span>
                    <button
                      onClick={() => navigate(`/servers/${srv.id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      <Terminal size={12} />
                      <span>Console</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
