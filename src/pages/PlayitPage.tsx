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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Playit.gg Integration</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              Active
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Global tunneling for Minecraft and game servers without port forwarding.
          </p>
        </div>
        <button
          onClick={fetchServers}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">Loading instances...</div>
      ) : servers.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30">
          <Server size={32} className="mx-auto text-zinc-600 mb-2" />
          <h3 className="text-sm font-semibold text-white">No Server Instances Available</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Deploy a server instance first to attach and manage Playit.gg tunnels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Server Selector Bar */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-theme-400" />
              <span className="text-sm font-medium text-zinc-200">Target Instance:</span>
            </div>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700 min-w-[220px]"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Port {s.port} - {s.status === "online" ? "Running" : "Stopped"})
                </option>
              ))}
            </select>
          </div>

          {/* Active Tunnel Interface */}
          {selectedServerId && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
              <div className="mb-4 pb-3 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Tunnel for {selectedServer?.name || "Server"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Host port: <span className="font-mono text-zinc-300">{selectedServer?.port}</span>
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
