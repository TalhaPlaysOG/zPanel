import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, Search, Bell } from "lucide-react";
import { useLocation, matchPath, Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { panelName, panelLogo } = useSettings();

  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth < 768) {
        setMobileOpen((prev) => !prev);
      } else {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  const isServerView =
    matchPath("/servers/:id/*", location.pathname) &&
    !matchPath("/servers/create", location.pathname);
  const isCreateServer = matchPath("/servers/create", location.pathname);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path === "/servers") return "Servers";
    if (path === "/servers/create") return "Deploy Server";
    if (path.startsWith("/servers/")) return "Server Management";
    if (path === "/admin/servers") return "All Servers";
    if (path === "/users") return "Users";
    if (path === "/account") return "Account";
    if (path === "/api-keys") return "API Keys";
    if (path === "/settings" || path === "/admin/settings") return "Settings";
    if (path === "/playit") return "Playit Tunnels";
    return "";
  };

  // Server view and create server have their own full-screen layout
  if (isServerView || isCreateServer) {
    return (
      <div
        style={{
          display: "flex",
          height: "100dvh",
          width: "100%",
          background: "var(--nb-bg-page)",
          color: "var(--nb-text-primary)",
          overflow: "hidden",
        }}
      >
        <main style={{ flex: 1, width: "100%", height: "100%", overflow: "auto" }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        width: "100%",
        background: "var(--nb-bg-page)",
        color: "var(--nb-text-primary)",
        overflow: "hidden",
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
          }}
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: "fixed" as const,
          insetBlock: 0,
          left: 0,
          zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="md:relative md:translate-x-0 md:!transform-none"
      >
        <Sidebar
          onClose={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ── Top Header / Navbar ── */}
        <header
          style={{
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.25rem",
            borderBottom: "1px solid var(--nb-border-subtle)",
            background: "rgba(8, 12, 31, 0.9)",
            backdropFilter: "blur(16px) saturate(1.2)",
            flexShrink: 0,
            zIndex: 30,
            position: "sticky",
            top: 0,
          }}
        >
          {/* Left side */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Mobile hamburger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              className="md:hidden"
              style={{
                padding: "0.4rem",
                borderRadius: "6px",
                background: "transparent",
                border: "none",
                color: "var(--nb-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Menu size={18} />
            </button>

            {/* Desktop collapse button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              className="hidden md:flex"
              style={{
                padding: "0.4rem",
                borderRadius: "6px",
                background: "transparent",
                border: "none",
                color: "var(--nb-text-dim)",
                cursor: "pointer",
                alignItems: "center",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-primary)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--nb-bg-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--nb-text-dim)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
              title="Toggle Sidebar"
            >
              <Menu size={16} />
            </button>

            {/* Breadcrumb */}
            {getBreadcrumb() && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Link
                  to="/"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--nb-text-dim)",
                    textDecoration: "none",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-secondary)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--nb-text-dim)")}
                >
                  Home
                </Link>
                <span style={{ color: "var(--nb-text-dim)", fontSize: "0.7rem" }}>/</span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "var(--nb-text-secondary)",
                  }}
                >
                  {getBreadcrumb()}
                </span>
              </div>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* Status indicator */}
            <div
              className="hidden md:flex"
              style={{
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "#34d399",
                letterSpacing: "0.04em",
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--nb-green)",
                  boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                  display: "inline-block",
                }}
              />
              ALL SYSTEMS GO
            </div>

            <GlobalSearchModal />
            <NotificationsDropdown />
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          style={{
            flex: 1,
            overflow: "hidden auto",
            position: "relative",
          }}
          className="custom-scrollbar"
        >
          {location.pathname === "/" ? (
            children
          ) : (
            <div
              style={{
                padding: "1.5rem 1.5rem 3rem",
                maxWidth: "1280px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
