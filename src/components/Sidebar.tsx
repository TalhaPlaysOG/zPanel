import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Server, Globe, Users, Settings, LogOut, Menu, X,
  ChevronRight, Shield, Cloud, Terminal, Database, RefreshCw, Play, Layout, Command,
  Zap, Layers, ShieldAlert, Wifi, Smartphone, BarChart3
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
    { name: "Terminal", path: "/terminal", icon: Terminal },
    { name: "Files", path: "/files", icon: Layers },
    { name: "Databases", path: "/databases", icon: Database },
    { name: "Schedules", path: "/schedules", icon: RefreshCw },
    { name: "Users", path: "/users", icon: Users },
    { name: "Backups", path: "/backups", icon: Command },
    { name: "Network", path: "/network", icon: Wifi },
    { name: "Startup", path: "/startup", icon: Play },
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Activity", path: "/activity", icon: BarChart3 },
  ];

  const adminLinks = [
    { name: "All Servers", path: "/admin/servers", icon: Server },
    { name: "Cloudflare Tunnel", path: "/cloudflare", icon: Cloud },
    { name: "Java Runtime", path: "/java-runtime", icon: Zap },
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
      className="zp-bg-sidebar border-r border-zp-border-subtle flex flex-col h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden"
      style={{
        width: isCollapsed ? "68px" : "220px",
      }}
    >
      {/* ── Header ── */}
      <div
        className="h-[60px] flex items-center justify-between px-4 border-b border-zp-border-subtle flex-shrink-0"
        style={{ paddingLeft: isCollapsed ? "0.875rem" : "1rem" }}
      >
        {!isCollapsed && (
          <Link
            to="/"
            className="flex items-center gap-2.5 no-underline overflow-hidden min-w-0 flex-1"
          >
            {panelLogo ? (
              <img
                src={panelLogo}
                alt="Logo"
                className="w-7 h-7 rounded-md object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-zp-primary-600 flex items-center justify-center shrink-0">
                <Layout size={14} color="#fff" />
              </div>
            )}
            <span className="text-sm font-bold text-zp-text-primary tracking-tight overflow-hidden truncate whitespace-nowrap">
              {panelName || "zPanel"}
            </span>
          </Link>
        )}

        {isCollapsed && (
          <Link to="/" className="no-underline">
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-7 h-7 rounded-md object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-zp-primary-600 flex items-center justify-center">
                <Layout size={14} color="#fff" />
              </div>
            )}
          </Link>
        )}

        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            className="md:flex p-1 rounded-md bg-transparent border-none text-zp-text-dim cursor-pointer flex items-center justify-center shrink-0 hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
            style={{ display: "none" }}
          >
            <Menu size={16} />
          </button>
        )}

        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Expand Sidebar"
            className="md:flex p-1 rounded-md bg-transparent border-none text-zp-text-dim cursor-pointer flex items-center justify-center shrink-0 hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
            style={{
              position: "absolute",
              top: "1.1rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "none",
            }}
          />
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 p-2 overflow-y-auto flex flex-col gap-0.5">
        {/* Main section */}
        {!isCollapsed && (
          <p className="zp-section-title mx-2 mt-0.5 mb-1">
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
              className="zp-nav-link"
              style={{
                padding: isCollapsed ? "0.5rem" : "0.625rem 0.75rem",
                justifyContent: isCollapsed ? "center" : "flex-start",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--zp-text-primary)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--zp-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--zp-text-muted)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zp-primary-500 rounded-r-md"
                />
              )}
              <Icon
                size={16}
                className={`flex-shrink-0 ${active ? "text-zp-primary-500" : "text-zp-text-muted"}`}
              />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden truncate">
                  {link.name}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="zp-divider mx-2 mt-1 mb-0.5" />
            {!isCollapsed && (
              <p className="zp-section-title mx-2 mb-0.5 flex items-center gap-1.5">
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
                  className="zp-nav-link"
                  style={{
                    padding: isCollapsed ? "0.5rem" : "0.625rem 0.75rem",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--zp-text-primary)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "var(--zp-bg-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--zp-text-muted)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    }
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-zp-primary-500 rounded-r-md"
                    />
                  )}
                  <Icon
                    size={16}
                    className={`flex-shrink-0 ${active ? "text-zp-primary-500" : "text-zp-text-muted"}`}
                  />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden truncate">
                      {link.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-zp-border-subtle p-2 flex-shrink-0 bg-black/20">
        {isCollapsed ? (
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex items-center justify-center p-1 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer hover:text-zp-danger hover:bg-zp-danger/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-md gap-2">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-7 h-7 rounded-full bg-zp-primary-800 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-zp-border">
                {avatarLetter}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-semibold text-zp-text-primary overflow-hidden truncate whitespace-nowrap">
                  {user?.username || "Admin"}
                </p>
                <p className="text-[0.65rem] text-zp-text-dim capitalize overflow-hidden truncate whitespace-nowrap">
                  {user?.role || "Administrator"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer hover:text-zp-danger hover:bg-zp-danger/10 transition-colors shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
