// @ts-nocheck
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Globe, Server, Play, Square, RefreshCw, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import PlayitTunnel from "./PlayitTunnel";

export default function PlayitPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/servers");
      const list = Array.isArray(res.data) ? res.data : [];
      setServers(list);
      if (list.length > 0) {
        setSelectedServerId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0].id));
      }
    } catch (err) {
      console.error("Failed to load servers for Playit", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[rgba(139,92,246,0.18)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#f0f4ff]">Playit.gg Integration</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
              Active
            </span>
          </div>
          <p className="text-sm text-[#94a3b8]">
            Global tunneling for Minecraft and game servers without port forwarding.
          </p>
        </div>
        <button
          onClick={fetchServers}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#94a3b8] hover:text-[#f0f4ff] bg-[rgba(6,9,26,0.6)] border border-[rgba(139,92,246,0.18)] hover:border-[rgba(139,92,246,0.35)] rounded-xl transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#94a3b8]">Loading instances…</div>
      ) : servers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.5)]">
          <Server size={32} className="mx-auto text-[#64748b] mb-2" />
          <h3 className="text-sm font-semibold text-white">No Server Instances Available</h3>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
            Deploy a server instance first to attach and manage Playit.gg tunnels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Server Selector Bar */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[#a78bfa]">
                <Server size={16} />
              </div>
              <span className="text-sm font-semibold text-[#f0f4ff]">Target Instance:</span>
            </div>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="px-3.5 py-2 text-sm bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.25)] focus:border-[#8b5cf6] rounded-xl text-white outline-none min-w-[240px]"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Port {s.port} • {s.status === "online" ? "Running" : "Stopped"})
                </option>
              ))}
            </select>
          </div>

          {/* Active Tunnel Interface */}
          {selectedServerId && (
            <div className="rounded-2xl border border-[rgba(139,92,246,0.18)] bg-[rgba(15,21,53,0.7)] backdrop-blur-xl p-5 sm:p-7 shadow-lg">
              <div className="mb-5 pb-4 border-b border-[rgba(139,92,246,0.12)] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#f0f4ff]">
                    Tunnel for {selectedServer?.name || "Server"}
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Host port: <span className="font-mono text-purple-400 font-semibold">{selectedServer?.port}</span>
                  </p>
                </div>
              </div>
              <PlayitTunnel serverId={selectedServerId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
