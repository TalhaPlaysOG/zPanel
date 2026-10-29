import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Server, Globe, Users, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion } from "framer-motion";

export function Sidebar({ onClose, isCollapsed, toggleCollapse }: { onClose?: () => void; isCollapsed?: boolean; toggleCollapse?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName } = useSettings();

  const links = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={19} /> },
    { name: "Servers", path: "/servers", icon: <Server size={19} /> },
    { name: "Playit", path: "/playit", icon: <Globe size={19} /> },
    { name: "Users", path: "/users", icon: <Users size={19} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={19} /> },
  ];

  return (
    <div className={`h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans border-r border-zinc-800 transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 flex-shrink-0">
        {!isCollapsed && (
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-theme-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {panelName?.[0]?.toUpperCase() || "Z"}
            </div>
            <span className="font-semibold text-sm truncate">{panelName || "zPanel"}</span>
          </Link>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors hidden md:flex"
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full px-3 py-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            Navigation
          </p>
        )}
        {links.map((link) => {
          const isActive = location.pathname === link.path || (link.path !== "/" && location.pathname.startsWith(link.path));
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              title={isCollapsed ? link.name : undefined}
              className={`relative flex items-center ${isCollapsed ? "justify-center px-0" : "px-3"} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <div className={`${isActive ? "text-theme-400" : "text-zinc-400"}`}>
                {link.icon}
              </div>
              {!isCollapsed && <span className="ml-3 truncate">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-zinc-800 mt-auto bg-zinc-950/80">
        {isCollapsed ? (
          <button
            onClick={logout}
            title="Logout"
            className="flex items-center justify-center w-full p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-zinc-700">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.username || "Admin"}</p>
                <p className="text-[11px] text-zinc-400 capitalize truncate">{user?.role || "Administrator"}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
