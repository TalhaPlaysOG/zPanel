import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Server, Play, Square, Plus, Cpu, HardDrive, Activity,
  RefreshCw, Terminal, AlertCircle, ArrowRight, Zap,
} from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  bar,
  barColor,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ElementType;
  iconColor?: string;
  bar?: number;
  barColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--nb-bg-card)",
        border: "1px solid var(--nb-border)",
        borderRadius: "0.75rem",
        padding: "1.125rem 1.25rem",
        transition: "border-color 0.2s, transform 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--nb-border-bright)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--nb-border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--nb-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "7px",
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={14} style={{ color: iconColor || "var(--nb-purple-400)" }} />
        </div>
      </div>

      {/* Value */}
      <div style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--nb-text-primary)", lineHeight: 1, marginBottom: "0.5rem" }}>
        {value}
      </div>

      {/* Sub */}
      {sub && (
        <div style={{ fontSize: "0.75rem", color: "var(--nb-text-muted)" }}>{sub}</div>
      )}

      {children}

      {/* Progress bar */}
      {bar !== undefined && (
        <div
          style={{
            marginTop: "0.75rem",
            height: "3px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, bar))}%`,
              background: barColor || "var(--nb-purple-500)",
              borderRadius: "999px",
              transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
              boxShadow: `0 0 8px 0 ${barColor || "var(--nb-purple-500)"}60`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.175rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.68rem",
        fontWeight: 600,
        background: online ? "rgba(16,185,129,0.1)" : "rgba(71,85,105,0.2)",
        color: online ? "#34d399" : "#64748b",
        border: `1px solid ${online ? "rgba(16,185,129,0.25)" : "rgba(71,85,105,0.3)"}`,
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: online ? "#10b981" : "#475569",
          ...(online ? { boxShadow: "0 0 5px rgba(16,185,129,0.6)" } : {}),
        }}
      />
      {online ? "Running" : "Stopped"}
    </span>
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
  const totalMemGB = stats ? (stats.totalMemory / (1024 * 1024 * 1024)).toFixed(1) : "0";
  const usedMemGB = stats
    ? ((stats.totalMemory - stats.freeMemory) / (1024 * 1024 * 1024)).toFixed(1)
    : "0";
  const memPercent =
    stats && stats.totalMemory > 0
      ? Math.round(((stats.totalMemory - stats.freeMemory) / stats.totalMemory) * 100)
      : 0;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem 1.5rem 3rem",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "var(--nb-text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Overview
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--nb-text-muted)", marginTop: "0.25rem" }}>
            System snapshot for <span style={{ color: "var(--nb-text-secondary)" }}>{panelName || "zPanel"}</span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <button
            onClick={() => refetch()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.45rem 0.875rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--nb-text-secondary)",
              background: "var(--nb-bg-card)",
              border: "1px solid var(--nb-border)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-primary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nb-border-bright)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nb-border)";
            }}
          >
            <RefreshCw size={13} className={state === "loading" ? "animate-spin" : ""} />
            Refresh
          </button>

          {user?.role === "admin" && (
            <Link
              to="/servers/create"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.45rem 0.875rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#fff",
                background: "var(--nb-purple-600)",
                border: "none",
                borderRadius: "0.5rem",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 0.15s, box-shadow 0.15s",
                boxShadow: "0 0 16px -4px rgba(124,58,237,0.5)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--nb-purple-500)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px -4px rgba(139,92,246,0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--nb-purple-600)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px -4px rgba(124,58,237,0.5)";
              }}
            >
              <Plus size={14} />
              Deploy Server
            </Link>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {state === "error" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.625rem",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: "0.8125rem",
            marginBottom: "1.25rem",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          Failed to sync live statistics. Showing cached state.
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Servers"
          value={totalServers}
          icon={Server}
          iconColor="var(--nb-purple-400)"
          sub={
            <span style={{ display: "flex", gap: "0.875rem" }}>
              <span style={{ color: "#34d399" }}>● {runningServers} running</span>
              <span style={{ color: "var(--nb-text-dim)" }}>● {stoppedServers} stopped</span>
            </span>
          }
        />

        <StatCard
          label="Panel Status"
          value={<span style={{ color: "#34d399" }}>Online</span>}
          icon={Activity}
          iconColor="#34d399"
          sub={
            <span>
              Process Manager:{" "}
              <span style={{ fontFamily: '"JetBrains Mono", monospace', color: "var(--nb-purple-400)" }}>PM2</span>
            </span>
          }
        />

        <StatCard
          label="Host CPU"
          value={`${cpuPercent}%`}
          icon={Cpu}
          iconColor={cpuPercent > 80 ? "#f87171" : cpuPercent > 50 ? "#fbbf24" : "#34d399"}
          sub="utilized"
          bar={cpuPercent}
          barColor={cpuPercent > 80 ? "#ef4444" : cpuPercent > 50 ? "#f59e0b" : "#10b981"}
        />

        <StatCard
          label="Host Memory"
          value={`${usedMemGB} GB`}
          icon={HardDrive}
          iconColor={memPercent > 85 ? "#f87171" : memPercent > 65 ? "#fbbf24" : "#34d399"}
          sub={`of ${totalMemGB} GB total`}
          bar={memPercent}
          barColor={memPercent > 85 ? "#ef4444" : memPercent > 65 ? "#f59e0b" : "#10b981"}
        />
      </div>

      {/* ── Servers Table ── */}
      <div
        style={{
          background: "var(--nb-bg-card)",
          border: "1px solid var(--nb-border)",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--nb-border)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--nb-text-primary)",
                margin: 0,
              }}
            >
              Instances
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--nb-text-muted)", marginTop: "0.15rem" }}>
              Configured game servers on this node
            </p>
          </div>
          <Link
            to="/servers"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--nb-purple-400)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-purple-300, #c4b5fd)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-purple-400)")}
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {servers.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <Server size={36} style={{ margin: "0 auto 0.75rem", color: "var(--nb-text-dim)" }} />
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--nb-text-secondary)", margin: "0 0 0.375rem" }}>
              No servers deployed
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--nb-text-muted)", marginBottom: "1.25rem" }}>
              Get started by deploying your first server instance.
            </p>
            {user?.role === "admin" && (
              <Link
                to="/servers/create"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 1.125rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#fff",
                  background: "var(--nb-purple-600)",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  boxShadow: "0 0 16px -4px rgba(124,58,237,0.5)",
                }}
              >
                <Plus size={14} /> Deploy Server
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                padding: "0.5rem 1.25rem",
                background: "rgba(6,9,26,0.4)",
                borderBottom: "1px solid var(--nb-border-subtle)",
              }}
            >
              {["Name", "Status", "Type", ""].map((h, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--nb-text-muted)",
                    textAlign: i > 0 ? "center" : "left",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {servers.slice(0, 10).map((srv) => {
              const online = srv.status === "online";
              return (
                <div
                  key={srv.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    alignItems: "center",
                    padding: "0.75rem 1.25rem",
                    borderBottom: "1px solid var(--nb-border-subtle)",
                    transition: "background 0.15s",
                    gap: "1rem",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--nb-bg-hover)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                >
                  {/* Name + port */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                    <Link
                      to={`/servers/${srv.id}`}
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--nb-text-primary)",
                        textDecoration: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-purple-400)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-primary)")}
                    >
                      {srv.name}
                    </Link>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--nb-text-muted)",
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      :{srv.port} · {srv.ram} GB
                    </span>
                  </div>

                  {/* Status */}
                  <StatusBadge online={online} />

                  {/* Type */}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      color: "var(--nb-text-muted)",
                      textTransform: "capitalize",
                      textAlign: "center",
                    }}
                  >
                    {srv.type || "Minecraft"}
                  </span>

                  {/* Action */}
                  <button
                    onClick={() => navigate(`/servers/${srv.id}`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.325rem 0.7rem",
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      color: "var(--nb-text-muted)",
                      background: "rgba(139,92,246,0.06)",
                      border: "1px solid var(--nb-border)",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-purple-400)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nb-border-bright)";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-muted)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nb-border)";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.06)";
                    }}
                  >
                    <Terminal size={11} />
                    Manage
                  </button>
                </div>
              );
            })}

            {servers.length > 10 && (
              <div style={{ padding: "0.875rem 1.25rem", textAlign: "center" }}>
                <Link
                  to="/servers"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--nb-purple-400)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  View all {servers.length} servers <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
