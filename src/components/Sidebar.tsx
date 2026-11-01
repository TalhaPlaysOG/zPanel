import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Server, Users, Settings, LogOut, X, Shield,
  Layout, Zap, Plus, HardDrive, UserCircle, Boxes
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

type NavItem = {
  name: string;
  path: string;
  icon: React.ElementType;
  exact?: boolean;
};

export function Sidebar({
  onClose,
  isCollapsed,
}: {
  onClose?: () => void;
  isCollapsed?: boolean;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const mainLinks: NavItem[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, exact: true },
    { name: "Servers", path: "/servers", icon: Server, exact: true },
    ...(isAdmin
      ? [{ name: "Create Server", path: "/servers/create", icon: Plus, exact: true } as NavItem]
      : []),
  ];

  const adminLinks: NavItem[] = [
    { name: "All Servers", path: "/admin/servers", icon: HardDrive },
    { name: "Nodes", path: "/admin/nodes", icon: Boxes },
    { name: "Users", path: "/users", icon: Users },
    { name: "Java Runtime", path: "/java-runtime", icon: Zap },
  ];

  const accountLinks: NavItem[] = [
    { name: "Account", path: "/account", icon: UserCircle },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const avatarLetter = user?.username?.[0]?.toUpperCase() || "U";

  const renderLink = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        title={isCollapsed ? item.name : undefined}
        aria-current={active ? "page" : undefined}
        className={`zp-nav-link ${active ? "active" : ""}`}
        style={{
          padding: isCollapsed ? "0.5rem" : "0.625rem 0.75rem",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <Icon
          size={17}
          className={`flex-shrink-0 ${active ? "text-zp-primary-400" : "text-zp-text-muted"}`}
        />
        {!isCollapsed && (
          <span className="whitespace-nowrap overflow-hidden truncate">{item.name}</span>
        )}
      </Link>
    );
  };

  return (
    <div
      className="zp-bg-sidebar border-r border-zp-border-subtle flex flex-col h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden"
      style={{ width: isCollapsed ? "72px" : "240px" }}
    >
      {/* ── Brand header ── */}
      <div
        className="h-[60px] flex items-center gap-2.5 px-4 border-b border-zp-border-subtle flex-shrink-0"
        style={{ justifyContent: isCollapsed ? "center" : "space-between" }}
      >
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 no-underline overflow-hidden min-w-0"
        >
          {panelLogo ? (
            <img
              src={panelLogo}
              alt="Logo"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-zp-primary-600 flex items-center justify-center shrink-0">
              <Layout size={16} color="#fff" />
            </div>
          )}
          {!isCollapsed && (
            <span className="text-sm font-bold text-zp-text-primary tracking-tight overflow-hidden truncate whitespace-nowrap">
              {panelName || "NexoraPanel"}
            </span>
          )}
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer hover:text-zp-text-primary hover:bg-zp-bg-hover transition-colors shrink-0"
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar flex flex-col gap-1">
        {!isCollapsed && <p className="zp-section-title px-2 mb-1">Navigation</p>}
        {mainLinks.map(renderLink)}

        {isAdmin && (
          <>
            <div className="zp-divider mx-1 my-2" />
            {!isCollapsed && (
              <p className="zp-section-title px-2 mb-1 flex items-center gap-1.5">
                <Shield size={10} /> Administration
              </p>
            )}
            {adminLinks.map(renderLink)}
          </>
        )}

        <div className="zp-divider mx-1 my-2" />
        {!isCollapsed && <p className="zp-section-title px-2 mb-1">Account</p>}
        {accountLinks.map(renderLink)}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-zp-border-subtle p-2.5 flex-shrink-0 bg-black/20">
        {isCollapsed ? (
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="w-full flex items-center justify-center p-2 rounded-lg bg-transparent border-none text-zp-text-muted cursor-pointer hover:text-zp-danger hover:bg-zp-danger/10 transition-colors"
          >
            <LogOut size={17} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-zp-primary-800 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-zp-border">
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
              type="button"
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-md bg-transparent border-none text-zp-text-muted cursor-pointer hover:text-zp-danger hover:bg-zp-danger/10 transition-colors shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
