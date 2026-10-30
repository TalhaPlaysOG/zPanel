/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ServerList from "./pages/ServerList";
import CreateServer from "./pages/CreateServer";
import ServerView from "./pages/ServerView";
import AccountPage from "./pages/AccountPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import AdminServers from "./pages/AdminServers";
import PlayitPage from "./pages/PlayitPage";
import CloudflareTunnel from "./pages/CloudflareTunnel";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import Layout from "./components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { UploadProvider } from "./context/UploadContext";
import { GlobalBackground } from "./components/GlobalBackground";
import { SystemUpdateListener } from "./components/SystemUpdateListener";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-transparent text-foreground">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-theme-600 border-t-transparent rounded-full"
      />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname.split("/")[1]} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full w-full flex flex-col"
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/servers" element={<ProtectedRoute><ServerList /></ProtectedRoute>} />
          <Route path="/servers/create" element={<ProtectedRoute><CreateServer /></ProtectedRoute>} />
          <Route path="/servers/:id/*" element={<ProtectedRoute><ServerView /></ProtectedRoute>} />
          <Route path="/admin/servers" element={<ProtectedRoute><AdminServers /></ProtectedRoute>} />
          <Route path="/cloudflare" element={<ProtectedRoute><CloudflareTunnel /></ProtectedRoute>} />
          <Route path="/playit" element={<ProtectedRoute><PlayitPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <SystemUpdateListener />
        <UploadProvider>
          <GlobalBackground />
          <Router>
            <AnimatedRoutes />
          </Router>
        </UploadProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

