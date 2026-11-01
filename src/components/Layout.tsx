import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { useLocation, matchPath, Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { panelName } = useSettings();

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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isServerView =
    !!matchPath("/servers/:id/*", location.pathname) &&
    !matchPath("/servers/create", location.pathname);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path === "/servers") return "Servers";
    if (path === "/servers/create") return "Create Server";
    if (path.startsWith("/servers/")) return "Server Management";
    if (path === "/admin/servers") return "All Servers";
    if (path === "/admin/nodes") return "Nodes";
    if (path === "/users") return "Users";
    if (path === "/account") return "Account";
    if (path === "/settings") return "Settings";
    if (path === "/playit") return "Playit Tunnels";
    if (path === "/java-runtime") return "Java Runtime Manager";
    return "";
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="zp-bg-page text-zp-text-primary h-[100dvh] w-full overflow-hidden font-sans flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: fixed drawer on mobile, in-flow column on desktop. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 h-full shrink-0 transition-transform duration-300 ease-in-out md:relative md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onClose={() => setMobileOpen(false)}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* ── Top Header / Navbar ── */}
        <header className="h-[60px] flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-zp-border-subtle bg-zp-bg-sidebar/80 backdrop-blur-xl flex-shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden p-1.5 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer flex items-center hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            {/* Desktop collapse button */}
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden md:flex p-1.5 rounded-md bg-transparent border-none text-zp-text-dim cursor-pointer items-center hover:bg-zp-bg-hover hover:text-zp-text-primary transition-colors"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <Menu size={17} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                to="/"
                className="text-zp-text-dim text-xs no-underline hover:text-zp-text-secondary transition-colors shrink-0"
              >
                Home
              </Link>
              {breadcrumb && (
                <>
                  <span className="text-zp-text-dim text-[0.7rem] shrink-0">/</span>
                  <span className="text-xs font-medium text-zp-text-secondary truncate">
                    {breadcrumb}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-zp-success/10 border border-zp-success/20 text-zp-success/90 text-[0.68rem] font-bold tracking-wide font-mono">
              <span className="w-[6px] h-[6px] rounded-full bg-zp-success shadow-[0_0_6px_rgba(54,201,143,0.6)] inline-block" />
              {panelName ? panelName.toUpperCase() : "NEXORAPANEL"}
            </div>

            <GlobalSearchModal />
            <NotificationsDropdown />
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          className={
            isServerView
              ? "flex-1 min-h-0 overflow-hidden relative"
              : "flex-1 min-h-0 overflow-y-auto relative custom-scrollbar"
          }
        >
          {isServerView ? (
            children
          ) : (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-12">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
