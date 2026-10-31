// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Terminal, AlertTriangle, ArrowRight, Check, RefreshCw, Cpu, Zap,
  Play, TerminalSquare, FileCode, Database, Globe
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function JavaRuntimeManager() {
  const { user } = useAuth();
  const [runtimes, setRuntimes] = useState([]);
  const [status, setStatus] = useState({ installed: false, versions: [], missing: true, error: null, recommendedVersion: null });
  const [installing, setInstalling] = useState(false);
  const [installingVersion, setInstallingVersion] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "info" });

  useEffect(() => {
    fetchRuntimes();
  }, []);

  const fetchRuntimes = async () => {
    try {
      const res = await axios.get("/api/system/java-runtimes");
      setRuntimes(res.data.versions || []);
      setStatus(res.data);
    } catch (e) {
      setMsg({ text: "Failed to detect Java runtimes", type: "error" });
    }
  };

  const handleRecheck = async () => {
    setMsg({ text: "", type: "info" });
    await fetchRuntimes();
  };

  const handleInstall = async (version) => {
    setInstalling(true);
    setInstallingVersion(version);
    setMsg({ text: "", type: "info" });
    try {
      const res = await axios.post("/api/system/java-runtimes/install", { version });
      if (res.data.success) {
        setMsg({ text: `Java ${version} installed successfully.`, type: "success" });
        await fetchRuntimes();
      } else {
        setMsg({ text: res.data.message || `Java ${version} installation failed.`, type: "error" });
      }
    } catch (e) {
      setMsg({ text: e?.response?.data?.error || `Failed to install Java ${version}`, type: "error" });
    } finally {
      setInstalling(false);
      setInstallingVersion(null);
    }
  };

  const isInstalled = (v) => runtimes.some(r => r.version === v);

  const versionColors = {
    '8': 'text-zp-text-muted',
    '11': 'text-zp-text-muted',
    '16': 'text-zp-text-muted',
    '17': 'text-zp-info',
    '21': 'text-zp-success',
    '25': 'text-zp-primary-400',
  };

  const javaDesc = {
    '8': 'Minecraft 1.16 and older',
    '11': 'Minecraft 1.17',
    '16': 'Minecraft 1.17+',
    '17': 'Minecraft 1.18 - 1.20.4',
    '21': 'Minecraft 1.20.5 - 1.21',
    '25': 'Minecraft 1.22+',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zp-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zp-primary-400 mb-1">
            <Zap size={14} /> Java Runtime Manager
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zp-text-primary">Java Runtime Management</h1>
          <p className="text-sm text-zp-text-muted mt-0.5">
            Detect, install, and select Java runtimes for Minecraft server processes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecheck}
            disabled={installing}
            className="zp-btn-ghost px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={installing ? "animate-spin" : ""} />
            <span>Recheck</span>
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="zp-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zp-border">
          <h3 className="text-sm font-bold text-zp-text-primary">Runtime Status</h3>
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 relative ${status.installed ? 'bg-zp-success' : 'bg-zp-text-dim'}`}>
              {status.installed && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zp-success opacity-75" />
              )}
            </span>
            <span className="text-xs font-medium">
              {status.installed ? "Java Runtime Available" : "No Java Runtime Detected"}
            </span>
          </div>
        </div>

        {!status.installed && (
          <div className="p-6 text-center">
            <Terminal className="w-16 h-16 mx-auto mb-4 text-zp-text-muted" />
            <h3 className="text-sm font-bold text-zp-text-primary">No Java runtime found</h3>
            <p className="text-sm text-zp-text-muted mt-1">
              Local Minecraft servers require a Java runtime to start. Install Java 21 (for Minecraft 1.20.5-1.21) or Java 25 (for Minecraft 1.22+).
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {[
                { version: '21', label: 'Install Java 21' },
                { version: '25', label: 'Install Java 25' },
              ].map(v => (
                <button
                  key={v.version}
                  onClick={() => handleInstall(v.version)}
                  disabled={installingVersion === v.version}
                  className="zp-btn-primary px-5 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {installingVersion === v.version ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {status.installed && status.versions.length > 0 && (
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[...new Set(status.versions.map(r => r.version))].map(v => {
                const count = status.versions.filter(r => r.version === v).length;
                return (
                  <div key={v} className="p-3 rounded-lg bg-black/30 border border-zp-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold text-sm ${versionColors[v] || 'text-zp-text-secondary'}`}>Java {v}</span>
                      <span className="text-[10px] font-mono text-zp-text-dim bg-zp-border/50 px-1.5 py-0.5 rounded">×{count}</span>
                    </div>
                    <p className="text-xs text-zp-text-muted">{javaDesc[v] || 'Compatible Java runtime'}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-zp-text-muted">Recommended:</span>
              <span className="font-mono text-xs text-zp-primary-400">{status.recommendedVersion || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Install Section */}
      <div className="zp-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zp-border">
          <h3 className="text-sm font-bold text-zp-text-primary">Install Java Runtime</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-zp-text-muted mb-4">
            Install a Java runtime from a reputable, maintained distribution with verified downloads.
            Select a version compatible with your target Minecraft release.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { version: '8', label: 'Java 8', desc: 'Minecraft 1.16 and older', color: 'text-zp-text-muted' },
              { version: '11', label: 'Java 11', desc: 'Minecraft 1.17', color: 'text-zp-text-muted' },
              { version: '16', label: 'Java 16', desc: 'Minecraft 1.17+', color: 'text-zp-text-muted' },
              { version: '17', label: 'Java 17', desc: 'Minecraft 1.18 - 1.20.4', color: 'text-zp-info' },
              { version: '21', label: 'Java 21', desc: 'Minecraft 1.20.5 - 1.21', color: 'text-zp-success' },
              { version: '25', label: 'Java 25', desc: 'Minecraft 1.22+', color: 'text-zp-primary-400' },
            ].map(v => {
              const installed = isInstalled(v.version);
              return (
                <div key={v.version} className="p-4 rounded-xl border transition-all cursor-pointer group ${
                  installed
                    ? 'border-zp-success/40 bg-zp-success/5'
                    : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                }">
                  <div className="flex items-center gap-3 mb-3">
                    <Cpu className="w-5 h-5" />
                    <span className={`font-bold text-sm ${installed ? 'text-zp-text-primary' : 'text-zp-text-secondary'}`}>{v.label}</span>
                    {installed && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-zp-success">
                        <Check size={12} /> Installed
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] ${v.color} mb-3`}>{v.desc}</p>
                  <button
                    onClick={() => handleInstall(v.version)}
                    disabled={installed || installingVersion === v.version}
                    className="w-full py-2 px-4 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      installed
                        ? 'bg-zp-success/10 text-zp-success border border-zp-success/20'
                        : installingVersion === v.version
                          ? 'bg-zp-text-muted text-white border-zp-text-muted'
                          : 'bg-zp-primary-600 text-white border-zp-primary-500 hover:bg-zp-primary-500 hover:border-zp-primary-400'
                    }"
                  >
                    {installingVersion === v.version ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : installed ? (
                      <Check size={14} />
                    ) : (
                      <Zap size={14} />
                    )}
                    <span>{installed ? 'Installed' : 'Install'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {msg.text && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              msg.type === 'success' ? 'bg-zp-success/10 border border-zp-success/20 text-zp-success' :
              msg.type === 'error' ? 'bg-zp-danger/10 border border-zp-danger/20 text-zp-danger' :
              'bg-zp-info/10 border border-zp-info/20 text-zp-info'
            }`}>
            {msg.type === 'success' && <Check size={14} className="mr-2 shrink-0" />}
            {msg.type === 'error' && <AlertTriangle size={14} className="mr-2 shrink-0" />}
            {msg.text}
          </div>
          )}
        </div>
      </div>

      {/* Manual Install Instructions */}
      <div className="zp-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zp-border">
          <h3 className="text-sm font-bold text-zp-text-primary">Manual Installation</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-zp-text-muted mb-3">
            If automatic installation fails, install Java manually using your system package manager:
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 rounded-lg bg-zp-bg-input border border-zp-border">
              <div className="text-zp-primary-400 mb-1">Ubuntu / Debian (apt):</div>
              <div className="text-zp-text-secondary">sudo apt update && sudo apt install -y openjdk-21-jre-headless</div>
            </div>
            <div className="p-3 rounded-lg bg-zp-bg-input border border-zp-border">
              <div className="text-zp-primary-400 mb-1">RHEL / CentOS / Fedora (dnf):</div>
              <div className="text-zp-text-secondary">sudo dnf install -y java-21-openjdk-headless</div>
            </div>
            <div className="p-3 rounded-lg bg-zp-bg-input border border-zp-border">
              <div className="text-zp-primary-400 mb-1">Verify installation:</div>
              <div className="text-zp-text-secondary">java -version</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
