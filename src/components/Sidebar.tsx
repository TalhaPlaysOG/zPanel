import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Server, Globe, Users, Settings, LogOut, Menu, X,
  ChevronRight, Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export function Sidebar({
  onClose,
  isCollapsed,
  toggleCollapse,
}: {
  onClose?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();

  const navLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Servers", path: "/servers", icon: Server },
    { name: "Playit", path: "/playit", icon: Globe },
  ];

  const adminLinks = [
    { name: "Users", path: "/users", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const avatarLetter = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <div
      style={{
        width: isCollapsed ? "68px" : "220px",
        background: "var(--nb-bg-sidebar)",
        borderRight: "1px solid var(--nb-border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "0 0.875rem" : "0 0.875rem 0 1rem",
          borderBottom: "1px solid var(--nb-border-subtle)",
          flexShrink: 0,
        }}
      >
        {!isCollapsed && (
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
              overflow: "hidden",
              flex: 1,
              minWidth: 0,
            }}
          >
            {panelLogo ? (
              <img
                src={panelLogo}
                alt="Logo"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Server size={14} color="#fff" />
              </div>
            )}
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "var(--nb-text-primary)",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {panelName || "zPanel"}
            </span>
          </Link>
        )}

        {isCollapsed && (
          <Link to="/" style={{ textDecoration: "none" }}>
            {panelLogo ? (
              <img
                src={panelLogo}
                alt="Logo"
                style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Server size={14} color="#fff" />
              </div>
            )}
          </Link>
        )}

        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            style={{
              padding: "0.35rem",
              borderRadius: "6px",
              background: "transparent",
              border: "none",
              color: "var(--nb-text-dim)",
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s, background 0.15s",
              flexShrink: 0,
            }}
            className="md:flex"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-primary)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--nb-bg-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-dim)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Menu size={16} />
          </button>
        )}

        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Expand Sidebar"
            style={{
              position: "absolute",
              top: "1.1rem",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "0.35rem",
              borderRadius: "6px",
              background: "transparent",
              border: "none",
              color: "var(--nb-text-dim)",
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s",
            }}
            className="md:flex"
          />
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden"
            style={{
              padding: "0.35rem",
              borderRadius: "6px",
              background: "transparent",
              border: "none",
              color: "var(--nb-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "0.75rem 0.5rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {/* Main section */}
        {!isCollapsed && (
          <p className="nb-section-title" style={{ marginTop: "0.25rem", marginBottom: "0.375rem" }}>
            Navigation
          </p>
        )}

        {navLinks.map((link) => {
          const active = isActive(link.path);
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              title={isCollapsed ? link.name : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: isCollapsed ? "0.5rem" : "0.5rem 0.625rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: active ? 600 : 500,
                color: active ? "#ffffff" : "var(--nb-text-muted)",
                background: active ? "rgba(37, 99, 235, 0.15)" : "transparent",
                border: `1px solid ${active ? "rgba(37, 99, 235, 0.3)" : "transparent"}`,
                transition: "all 0.15s",
                justifyContent: isCollapsed ? "center" : "flex-start",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-primary)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--nb-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-muted)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 0, top: "50%",
                    transform: "translateY(-50%)",
                    width: "2px",
                    height: "60%",
                    background: "#2563eb",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              <Icon
                size={16}
                style={{ color: active ? "#60a5fa" : "var(--nb-text-muted)", flexShrink: 0 }}
              />
              {!isCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link.name}</span>}
            </Link>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="nb-divider" style={{ margin: "0.625rem 0.25rem" }} />
            {!isCollapsed && (
              <p className="nb-section-title" style={{ marginBottom: "0.375rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Shield size={10} /> Admin
              </p>
            )}
            {adminLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  title={isCollapsed ? link.name : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: isCollapsed ? "0.5rem" : "0.5rem 0.625rem",
                    borderRadius: "0.5rem",
                    textDecoration: "none",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#ffffff" : "var(--nb-text-muted)",
                    background: active ? "rgba(37, 99, 235, 0.15)" : "transparent",
                    border: `1px solid ${active ? "rgba(37, 99, 235, 0.3)" : "transparent"}`,
                    transition: "all 0.15s",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-primary)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "var(--nb-bg-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-muted)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    }
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0, top: "50%",
                        transform: "translateY(-50%)",
                        width: "2px",
                        height: "60%",
                        background: "#2563eb",
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                  )}
                  <Icon
                    size={16}
                    style={{ color: active ? "#60a5fa" : "var(--nb-text-muted)", flexShrink: 0 }}
                  />
                  {!isCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* ── User footer ── */}
      <div
        style={{
          borderTop: "1px solid var(--nb-border-subtle)",
          padding: "0.625rem 0.5rem",
          flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
        }}
      >
        {isCollapsed ? (
          <button
            onClick={logout}
            title="Logout"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "transparent",
              border: "none",
              color: "var(--nb-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.375rem 0.5rem",
              borderRadius: "0.5rem",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", minWidth: 0 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#1e3a5f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                  border: "1px solid #242c3f",
                }}
              >
                {avatarLetter}
              </div>
              <div style={{ overflow: "hidden", minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--nb-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.username || "Admin"}
                </p>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--nb-text-dim)",
                    textTransform: "capitalize",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.role || "Administrator"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              style={{
                padding: "0.35rem",
                borderRadius: "6px",
                background: "transparent",
                border: "none",
                color: "var(--nb-text-muted)",
                cursor: "pointer",
                transition: "color 0.15s, background 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-muted)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
