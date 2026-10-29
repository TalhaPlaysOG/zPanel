import React, { useState, useEffect } from "react";
import { Server, Settings, Plus, X, ServerCrash, CheckCircle2, ShieldAlert } from "lucide-react";
import axios from "axios";

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    hostname: "",
    apiUrl: "",
    token: "",
    ssl: false,
    apiPort: 8080,
    memory: 8192,
    disk: 50000,
    location: "Default"
  });

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/nodes");
      setNodes(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load nodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/nodes", formData);
      setIsModalOpen(false);
      setFormData({ name: "", hostname: "", apiUrl: "", token: "", ssl: false, apiPort: 8080, memory: 8192, disk: 50000, location: "Default" });
      fetchNodes();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add node");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Wings Nodes</h1>
          <p className="mt-2 text-muted-foreground">Manage your Pterodactyl Wings execution environments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-theme-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-theme-700 transition-all"
        >
          <Plus className="h-5 w-5" /> Add Wings Node
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-500 flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <ServerCrash className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No nodes configured</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Connect a Pterodactyl Wings node to start hosting Minecraft servers.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node: any) => (
            <div key={node.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-500/10 rounded-lg text-theme-500">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{node.name}</h3>
                      <p className="text-xs text-muted-foreground">{node.hostname || node.ip || "localhost"}:{node.apiPort || 8080}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Online
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Total Memory</div>
                    <div className="font-medium">{Math.round(node.memory / 1024)} GB</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Total Disk</div>
                    <div className="font-medium">{Math.round(node.disk / 1024)} GB</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="text-xl font-bold">Add Wings Node</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddNode} className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Node Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-theme-600 focus:outline-none focus:ring-1 focus:ring-theme-600"
                  placeholder="e.g. EU Node 01"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Hostname (FQDN or IP)</label>
                  <input
                    required
                    type="text"
                    value={formData.hostname}
                    onChange={e => setFormData({...formData, hostname: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-theme-600 focus:outline-none focus:ring-1 focus:ring-theme-600"
                    placeholder="node1.example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">API Port</label>
                  <input
                    type="number"
                    value={formData.apiPort}
                    onChange={e => setFormData({...formData, apiPort: parseInt(e.target.value)})}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-theme-600 focus:outline-none focus:ring-1 focus:ring-theme-600"
                    placeholder="8080"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.ssl} 
                    onChange={e => setFormData({...formData, ssl: e.target.checked})} 
                    className="text-theme-600 rounded border-border bg-background"
                  />
                  <span className="text-sm font-medium text-muted-foreground">Use SSL for API Connection</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">API Token</label>
                <input
                  required
                  type="password"
                  value={formData.token}
                  onChange={e => setFormData({...formData, token: e.target.value})}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-theme-600 focus:outline-none focus:ring-1 focus:ring-theme-600"
                  placeholder="Wings bearer token"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-theme-700 p-3 text-sm font-semibold text-white hover:bg-theme-600 transition-colors"
                >
                  Save Node Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
