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
    if (path === "/cloudflare") return "Cloudflare Tunnel";
    if (path === "/java-runtime") return "Java Runtime Manager";
    return "";
  };

  return (
    <div className="zp-bg-page text-zp-text-primary min-h-[100dvh] w-full overflow-hidden font-sans">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:!transform-none"
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <Sidebar
          onClose={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* ── Top Header / Navbar ── */}
        <header className="h-[60px] flex items-center justify-between px-4 border-b border-zp-border-subtle bg-black/60 backdrop-blur-xl flex-shrink-0 z-30 sticky top-0">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              className="md:hidden p-1 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer flex items-center hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
            >
              <Menu size={18} />
            </button>

            {/* Desktop collapse button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              className="hidden md:flex p-1 rounded-md bg-transparent border-none text-zp-text-dim cursor-pointer flex items-center hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
              title="Toggle Sidebar"
            >
              <Menu size={16} />
            </button>

            {/* Breadcrumb */}
            {getBreadcrumb() && (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/"
                  className="text-zp-text-dim text-xs no-underline hover:text-zp-text-secondary transition-colors"
                >
                  Home
                </Link>
                <span className="text-zp-text-dim text-[0.7rem]">/</span>
                <span className="text-xs font-medium text-zp-text-secondary">
                  {getBreadcrumb()}
                </span>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zp-success/10 border border-zp-success/20 text-zp-success/90 text-[0.68rem] font-bold tracking-wide font-mono">
              <span className="w-[6px] h-[6px] rounded-full bg-zp-success shadow-[0_0_6px_rgba(54,201,143,0.6)] inline-block" />
              ALL SYSTEMS GO
            </div>

            <GlobalSearchModal />
            <NotificationsDropdown />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="p-6 sm:p-8 max-w-full w-full pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
