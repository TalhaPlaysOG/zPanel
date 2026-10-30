import { Request, Response } from "express";
import { readJSON, writeJSON } from "../services/db.js";
import {
  createServerRuntime,
  startServerRuntime,
  stopServerRuntime,
  restartServerRuntime,
  deleteServerRuntime,
  getServerRuntimeStatus,
  getServerRuntimeStats,
  getServerRuntimeLogs,
  sendServerRuntimeCommand,
  attachServerRuntimeSocket,
  resolveRuntimeType
} from "../services/runtime.js";
import { getLocalProcessInfo, clearLocalServerRuntime } from "../services/local.js";
import { panelEvents } from "../events.js";
import { createSftpUser, deleteSftpUser } from "../services/sftp.js";
import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import { ZipArchive } from "archiver";
import extract from "extract-zip";
import { extractArchive } from "../utils/extract.js";

const SERVER_ID_RE = /^[a-zA-Z0-9-]{6,64}$/;

const emitServerStatus = (req: Request, server: any) => {
  const io = req.app.get("io");
  if (io) {
    io.to(`server_${server.id}`).emit("server_status", {
      id: server.id,
      status: server.status,
      running: ["starting", "online", "stopping"].includes(server.status),
      startedAt: server.startedAt || null,
      readyAt: server.readyAt || null,
      error: server.lastError || null,
    });
  }
};

/**
 * Ask the runtime for the real process state and copy it onto the server
 * record. A server is only "online" once the Minecraft process has reported
 * that it finished starting.
 */
const applyRuntimeStatus = async (server: any) => {
  let status: any = null;
  try {
    status = await getServerRuntimeStatus(server);
  } catch (err: any) {
    console.warn(`[Status] Failed to read runtime status for ${server.id}: ${err.message}`);
  }

  const running = !!status?.State?.Running;
  const lifecycle = status?.State?.Status;

  if (!status) {
    server.status = server.status === "error" ? "error" : "offline";
    server.startedAt = null;
    server.readyAt = null;
  } else {
    server.status = lifecycle || (running ? "starting" : "offline");
    server.startedAt = running ? status?.State?.StartedAt || server.startedAt || null : null;
    server.readyAt = running ? status?.State?.ReadyAt || null : null;
    server.lastError = status?.State?.Error || null;
  }

  if ((await resolveRuntimeType(server)) === "local") {
    const info = getLocalProcessInfo(server.id);
    if (info) {
      server.pid = info.pid;
      server.jarPath = info.jarPath;
      server.logPath = info.logPath;
    }
  }

  return server;
};

export const getServers = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];

  // Filter for normal users
  const userServers = user.role === "admin" || user.role === "owner" ? servers : servers.filter((s: any) => s.owner === user.id);

  // Update statuses from the actual runtime state.
  const updatedServers = await Promise.all(userServers.map((server: any) => applyRuntimeStatus(server)));

  res.json(updatedServers);
};

export const getServer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await applyRuntimeStatus(server);
  res.json(server);
};

export const getServerStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await applyRuntimeStatus(server);
  const isRunning = ["starting", "online", "stopping"].includes(server.status);
  const startedAt = isRunning ? server.startedAt || null : null;
  let uptimeSeconds = 0;
  if (isRunning && startedAt) {
    const startedMs = new Date(startedAt).getTime();
    if (!isNaN(startedMs) && startedMs > 0) {
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    }
  }

  const stats = await getServerRuntimeStats(server).catch(() => null);
  res.json({
    ...(stats || { cpu: 0, ram: 0, disk: 0 }),
    isRunning,
    status: server.status,
    startedAt,
    readyAt: server.readyAt || null,
    uptimeSeconds,
    error: server.lastError || null,
    limitRam: server.ram ? server.ram * 1024 : 1024,
    limitCpu: server.cpu || 100,
    limitDisk: server.disk || 10
  });
};

/**
 * Historical console logs. Uses the real Minecraft log file when available.
 */
export const getServerLogs = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const requested = Number(req.query.lines);
  const lines = Number.isFinite(requested) ? Math.min(Math.max(requested, 20), 2000) : 300;
  const logs = await getServerRuntimeLogs(server, lines).catch(() => "");
  res.json({ logs: logs ? logs.split(/\r?\n/) : [] });
};


export const checkPort = async (req: Request, res: Response) => {
  const { port } = req.query;
  if (!port) return res.status(400).json({ error: "Port is required" });
  
  const servers = await readJSON("servers.json") || [];
  const inUse = servers.some((s: any) => s.port == port);
  
  res.json({ inUse });
};

// Simple in-memory mutex to prevent race conditions on server creation
let isCreatingServer = false;

export const createServer = async (req: Request, res: Response) => {
  if (isCreatingServer) {
    return res.status(409).json({ error: "Server creation in progress, please try again in a few seconds." });
  }
  isCreatingServer = true;
  try {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") {
    return res.status(403).json({ error: "Only admins can create servers" });
  }
  const { name, ram, port, version, theme, cpu, disk, owner, ownerId, ipAlias, type, nodeId, runtimeType } = req.body;
  if (!name || !ram || !port) {
    res.status(400).json({ error: "Missing required fields (name, ram, port)" });
    return;
  }

  const id = crypto.randomUUID();
  const requestedRuntime = runtimeType || "docker";
  const effectiveRuntime = await resolveRuntimeType({
    id,
    runtimeType: requestedRuntime,
    nodeId: nodeId || "local",
  });

  const serverData = {
    id,
    name,
    owner: owner || ownerId || user.id, // Support assigning owner at creation
    ram,
    cpu: cpu || 100,
    disk: disk || 10,
    port,
    ipAlias: ipAlias || "",
    runtimeType: effectiveRuntime,
    nodeId: nodeId || "local",
    type: type || "PAPER",
    version: version || "latest",
    theme: theme || "default",
    status: "installing",
    createdAt: new Date().toISOString(),
    containerId: null as string | null,
  };

  const servers = await readJSON("servers.json") || [];
  
  if (servers.find((s: any) => s.port == port)) {
    res.status(400).json({ error: "Port is already in use by another server." });
    return;
  }

  servers.push(serverData);
  await writeJSON("servers.json", servers);

  // Pre-seed files for Node.js and Python applications
  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    await fs.ensureDir(serverDir);
    const upperType = (type || "PAPER").toUpperCase();
    if (upperType === "NODEJS" || upperType === "NODE") {
      const indexPath = path.join(serverDir, "index.js");
      const pkgPath = path.join(serverDir, "package.json");
      if (!fs.existsSync(indexPath)) {
        await fs.writeFile(indexPath, `// Node.js Application on zPanel\nconst http = require('http');\nconst port = process.env.PORT || process.env.SERVER_PORT || ${port};\n\nconsole.log('==============================================');\nconsole.log('🚀 Node.js Application Running on port ' + port);\nconsole.log('Node Version: ' + process.version);\nconsole.log('Upload your files in File Manager to customize!');\nconsole.log('==============================================');\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({\n    status: 'online',\n    runtime: 'node.js',\n    time: new Date().toISOString()\n  }));\n});\n\nserver.listen(port, '0.0.0.0', () => {\n  console.log(\`[Server] Listening on http://0.0.0.0:\${port}\`);\n});\n`);
      }
      if (!fs.existsSync(pkgPath)) {
        await fs.writeFile(pkgPath, JSON.stringify({
          name: name.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || "node-app",
          version: "1.0.0",
          description: "Node.js application hosted on zPanel",
          main: "index.js",
          scripts: {
            "start": "node index.js"
          },
          dependencies: {}
        }, null, 2));
      }
    } else if (upperType === "PYTHON" || upperType === "PYTHON3") {
      const mainPath = path.join(serverDir, "main.py");
      const reqPath = path.join(serverDir, "requirements.txt");
      if (!fs.existsSync(mainPath)) {
        await fs.writeFile(mainPath, `# Python Application on zPanel\nimport os\nimport sys\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nport = int(os.environ.get("SERVER_PORT", os.environ.get("PORT", ${port})))\n\nprint("==============================================", flush=True)\nprint("🐍 Python Application Running", flush=True)\nprint(f"Python Version: {sys.version}", flush=True)\nprint(f"Listening Port: {port}", flush=True)\nprint("Upload your files in File Manager to customize!", flush=True)\nprint("==============================================", flush=True)\n\nclass RequestHandler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-type', 'application/json')\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "runtime": "python"}')\n\n    def log_message(self, format, *args):\n        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)\n\nserver = HTTPServer(('0.0.0.0', port), RequestHandler)\nprint(f"[Server] Listening on http://0.0.0.0:{port}", flush=True)\n\ntry:\n    server.serve_forever()\nexcept KeyboardInterrupt:\n    print("\\nStopping server...", flush=True)\n    server.server_close()\n`);
      }
      if (!fs.existsSync(reqPath)) {
        await fs.writeFile(reqPath, "# Add python dependencies here\n");
      }
    }
  } catch (seedErr) {
    console.warn("Failed to pre-seed starter files:", seedErr);
  }

  try {
    const containerId = await createServerRuntime(serverData);
    serverData.containerId = containerId;
    serverData.status = "offline";
    await writeJSON("servers.json", Object.assign(servers, servers.map((s:any)=>s.id===id?serverData:s)));
    await createSftpUser(id).catch(e => console.error("SFTP user creation failed:", e));
    res.json(serverData);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
  } finally {
    isCreatingServer = false;
  }
};

export const updateOwner = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") {
    return res.status(403).json({ error: "Only admins can update owner" });
  }

  const { id } = req.params;
  const { owner } = req.body;

  if (!owner) return res.status(400).json({ error: "Owner required" });

  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);

  if (!server) return res.status(404).json({ error: "Server not found" });

  server.owner = owner;
  await writeJSON("servers.json", servers);
  
  res.json({ success: true });
};

export const updateIpAlias = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { ipAlias } = req.body;

  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);

  if (!server) return res.status(404).json({ error: "Server not found" });

  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  server.ipAlias = ipAlias;
  await writeJSON("servers.json", servers);
  
  res.json({ success: true });
};

export const deleteServer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  if (!SERVER_ID_RE.test(id)) {
    return res.status(400).json({ error: "Invalid server id" });
  }

  let servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);

  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  const isPrivileged = user.role === "admin" || user.role === "owner";
  const isOwner = server.owner && server.owner === user.id;
  if (!isPrivileged && !isOwner) {
    return res.status(403).json({ error: "You do not have permission to delete this server" });
  }

  try {
    // 1. Stop the server gracefully if it is running.
    try {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        await stopServerRuntime(server);
      }
    } catch (stopErr: any) {
      console.warn(`[Delete] Failed to stop server ${id} before deletion: ${stopErr.message}`);
    }

    // 2. Remove the container / local process and its stream state.
    try {
      await deleteServerRuntime(server);
    } catch (runtimeErr: any) {
      console.warn(`[Delete] Runtime cleanup failed for ${id}: ${runtimeErr.message}`);
    }
    clearLocalServerRuntime(id);

    // 3. Remove server files and backups.
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const backupsDir = path.join(process.cwd(), ".data", "backups", id);
    await fs.remove(serverDir);
    await fs.remove(backupsDir);

    if (await fs.pathExists(serverDir)) {
      throw new Error("Server files could not be removed completely. Check file permissions.");
    }

    // 4. Remove associated credentials / tunnel configuration.
    await deleteSftpUser(id).catch((e) => console.error("SFTP user deletion failed:", e));
    try {
      const { deleteCloudflareConfig, stopCloudflareTunnel } = await import("../services/cloudflare.js");
      await stopCloudflareTunnel(id, server).catch(() => {});
      await deleteCloudflareConfig(id).catch(() => {});
    } catch (cfErr: any) {
      console.warn(`[Delete] Cloudflare cleanup failed for ${id}: ${cfErr.message}`);
    }

    // 5. Best-effort Playit process cleanup (never touches other servers).
    const safeName = String(server.name || id).replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      const { execFile } = await import("child_process");
      execFile("npx", ["pm2", "delete", `playit_${safeName}`], () => {});
    } catch {
      /* ignore */
    }

    // 6. Remove the database record only after cleanup succeeded.
    servers = servers.filter((s: any) => s.id !== id);
    await writeJSON("servers.json", servers);

    // 7. Drop any connected console sockets and notify clients.
    const io = req.app.get("io");
    if (io) {
      io.to(`server_${id}`).emit("server_deleted", { id });
      io.in(`server_${id}`).socketsLeave(`server_${id}`);
    }

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("Delete server error:", err);
    res.status(500).json({ error: err.message || "Failed to delete server" });
  }
};

export const startServer = async (req: Request, res: Response) => {
  let server: any = null;
  let servers: any[] = [];
  try {
    const { id } = req.params;
    servers = await readJSON("servers.json") || [];

    server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Not found" });
    }

    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (server.suspended) {
      return res.status(403).json({ error: "Server is suspended" });
    }

    if (!server.containerId) {
      server.containerId = await createServerRuntime(server);
      await writeJSON("servers.json", servers);
    }

    // If the runtime is already running there is nothing to do. Never report
    // "online" just because a start request was received.
    const current = await getServerRuntimeStatus(server).catch(() => null);
    if (current?.State?.Running) {
      await applyRuntimeStatus(server);
      await writeJSON("servers.json", servers);
      emitServerStatus(req, server);
      return res.json({
        success: true,
        alreadyRunning: true,
        status: server.status,
        startedAt: server.startedAt || null,
      });
    }

    // PRE-FLIGHT CHECKS
    try {
      const serverDir = path.join(process.cwd(), ".data", "servers", server.id);

      // 1. Check for stale session locks and remove them if server is stopped.
      // The server is verified stopped above, so removing these is safe.
      const lockFiles = [
        path.join(serverDir, "world", "session.lock"),
        path.join(serverDir, "world_nether", "session.lock"),
        path.join(serverDir, "world_the_end", "session.lock")
      ];
      for (const lockFile of lockFiles) {
        if (fs.existsSync(lockFile)) {
          try {
            await fs.remove(lockFile);
          } catch (e) {
            return res.status(500).json({ error: `Startup Diagnostic Failed: Permission denied when removing stale ${lockFile}` });
          }
        }
      }

      // 2. Check permissions on world folder
      const worldPath = path.join(serverDir, "world");
      if (fs.existsSync(worldPath)) {
        try {
          await fs.access(worldPath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (e) {
           return res.status(500).json({ error: "Startup Diagnostic Failed: Permission denied on world folder." });
        }
      }
    } catch (preflightErr) {
      console.error(preflightErr);
    }

    server.status = "starting";
    server.startedAt = null;
    server.readyAt = null;
    server.lastError = null;
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);

    try {
      const io = req.app.get("io");
      if (io) io.to(`server_${id}`).emit("clear_logs");

      await startServerRuntime(server);
    } catch (startErr: any) {
      if (startErr.statusCode === 404 || (startErr.message && startErr.message.toLowerCase().includes("no such container"))) {
        console.log(`Container missing for server ${server.id}. Recreating...`);
        server.containerId = await createServerRuntime(server);
        await startServerRuntime(server);
      } else {
        throw startErr;
      }
    }

    await attachServerRuntimeSocket(server, server.id);

    // Refresh the status from the runtime. A local Minecraft process stays in
    // "starting" until it prints its readiness line.
    await applyRuntimeStatus(server);
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);

    if (server.status === "error") {
      return res.status(500).json({
        error: server.lastError || "Server failed to start",
        status: server.status,
        startedAt: server.startedAt || null,
      });
    }

    res.json({
      success: true,
      status: server.status,
      startedAt: server.startedAt || null,
      error: server.lastError || null,
    });
  } catch (err: any) {
    console.error("Start server error:", err);
    if (server) {
      server.status = "error";
      server.startedAt = null;
      server.readyAt = null;
      server.lastError = err.message || "Failed to start server";
      try {
        await writeJSON("servers.json", servers);
        emitServerStatus(req, server);
      } catch {
        /* ignore persistence errors */
      }
    }
    res.status(500).json({ error: err.message || "Failed to start server", status: "error" });
  }
};

export const stopServer = async (req: Request, res: Response) => {
  let server: any = null;
  let servers: any[] = [];
  try {
    const { id } = req.params;
    servers = await readJSON("servers.json") || [];
    server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Not found" });
    }

    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    server.status = "stopping";
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);

    try {
      await stopServerRuntime(server);
    } catch (stopErr: any) {
      if (stopErr.statusCode === 404 || (stopErr.message && stopErr.message.toLowerCase().includes("no such container"))) {
        console.log(`Container already missing for server ${server.id}. Assuming stopped.`);
      } else {
        throw stopErr;
      }
    }

    await applyRuntimeStatus(server);
    if (server.status !== "error") {
      server.status = "offline";
      server.lastError = null;
    }
    server.startedAt = null;
    server.readyAt = null;
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);
    res.json({ success: true, status: server.status });
  } catch (err: any) {
    console.error("Stop server error:", err);
    if (server) {
      server.status = "error";
      server.lastError = err.message || "Failed to stop server";
      try {
        await writeJSON("servers.json", servers);
        emitServerStatus(req, server);
      } catch {
        /* ignore */
      }
    }
    res.status(500).json({ error: err.message || "Failed to stop server" });
  }
};

export const restartServer = async (req: Request, res: Response) => {
  let server: any = null;
  let servers: any[] = [];
  try {
    const { id } = req.params;
    servers = await readJSON("servers.json") || [];
    server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Not found" });
    }

    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (server.suspended) {
      return res.status(403).json({ error: "Server is suspended" });
    }

    if (!server.containerId) {
      server.containerId = await createServerRuntime(server);
      await writeJSON("servers.json", servers);
    }

    server.status = "starting";
    server.startedAt = null;
    server.readyAt = null;
    server.lastError = null;
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);

    try {
      const io = req.app.get("io");
      if (io) io.to(`server_${id}`).emit("clear_logs");

      await restartServerRuntime(server);
    } catch (startErr: any) {
      if (startErr.statusCode === 404 || (startErr.message && startErr.message.toLowerCase().includes("no such container"))) {
        console.log(`Container missing for server ${server.id}. Recreating...`);
        server.containerId = await createServerRuntime(server);
        await startServerRuntime(server);
      } else {
        throw startErr;
      }
    }

    await attachServerRuntimeSocket(server, server.id);
    await applyRuntimeStatus(server);
    await writeJSON("servers.json", servers);
    emitServerStatus(req, server);

    if (server.status === "error") {
      return res.status(500).json({
        error: server.lastError || "Server failed to restart",
        status: server.status,
        startedAt: server.startedAt || null,
      });
    }

    res.json({
      success: true,
      status: server.status,
      startedAt: server.startedAt || null,
      error: server.lastError || null,
    });
  } catch (err: any) {
    console.error("Restart server error:", err);
    if (server) {
      server.status = "error";
      server.startedAt = null;
      server.readyAt = null;
      server.lastError = err.message || "Failed to restart server";
      try {
        await writeJSON("servers.json", servers);
        emitServerStatus(req, server);
      } catch {
        /* ignore */
      }
    }
    res.status(500).json({ error: err.message || "Failed to restart server", status: "error" });
  }
};

export const sendCommand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    const user = (req as any).user;

    if (typeof command !== "string" || !command.trim()) {
      return res.status(400).json({ error: "Command is required" });
    }
    if (command.length > 2000 || /[\r\n]/.test(command)) {
      return res.status(400).json({ error: "Invalid command" });
    }

    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Not found" });
    }
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await sendServerRuntimeCommand(server, command.trim());
    res.json({ success: true });
  } catch (err: any) {
    console.error("Command error:", err);
    res.status(500).json({ error: err.message || "Failed to send command" });
  }
};

export const changeServerVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version, type } = req.body;
    const user = (req as any).user;
    
    if (!version) return res.status(400).json({ error: "Version is required" });
    
    let servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can change version" });
    }

    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        return res.status(400).json({ error: "Server must be stopped before changing version. Please stop the server first." });
      }
      // Delete old container
      await deleteServerRuntime(server);
    }

    // Automatically delete config files to avoid issues when switching versions/types
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const filesToDelete = [
      "paper-global.yml", "paper-world-defaults.yml", "paper.yml",
      "config/paper-global.yml", "config/paper-world-defaults.yml",
      "world/data/random_sequences.dat"
    ];
    
    for (const file of filesToDelete) {
      const filePath = path.join(serverDir, file);
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      } catch (e) {
        console.error(`Failed to delete ${file}`, e);
      }
    }

    // Delete the old server JAR so the next start downloads the correct version.
    // Check common filenames to handle software-type switches.
    const jarNamesToDelete = ["server.jar", "purpur.jar", "paper.jar", "spigot.jar", "fabric-server.jar", "minecraft_server.jar"];
    for (const jarName of jarNamesToDelete) {
      const jarPath = path.join(serverDir, jarName);
      try {
        if (await fs.pathExists(jarPath)) {
          await fs.remove(jarPath);
          console.log(`[ChangeVersion] Removed old JAR: ${jarName}`);
        }
      } catch (e) {
        console.warn(`[ChangeVersion] Could not remove ${jarName}:`, e);
      }
    }

    // Also clean Forge-specific launch args so the installer re-runs on next start.
    const forgeArgsToClean = [
      "libraries/net/minecraftforge/forge/args.txt",
      "user_jvm_args.txt", "unix_args.txt", "win_args.txt"
    ];
    for (const argsFile of forgeArgsToClean) {
      try {
        const argsPath = path.join(serverDir, argsFile);
        if (await fs.pathExists(argsPath)) await fs.remove(argsPath);
      } catch { /* ignore */ }
    }
    
    server.version = version;
    if (type) {
      server.type = type;
    }
    // Recreate container with new version env
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    
    await writeJSON("servers.json", servers);
    
    res.json({ success: true, version, type: server.type });
  } catch (err: any) {
    console.error("Change version error", err);
    res.status(500).json({ error: err.message });
  }
};


// File manager basics
export const getFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dirPath = req.query.path ? String(req.query.path) : "/";
  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath);
  
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const stats = await fs.stat(targetPath).catch(() => null);
    if (!stats) {
      // Return empty if not found
      return res.json([]);
    }
    if (stats.isFile()) {
       const content = await fs.readFile(targetPath, "utf-8");
       return res.json({ isFile: true, content });
    }
    const files = await fs.readdir(targetPath, { withFileTypes: true });
    res.json(files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      size: f.isDirectory() ? 0 : fs.statSync(path.join(targetPath, f.name)).size
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const uploadChunk = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { uploadId, chunkIndex, fileName, path: dirPath } = req.body;
  
  if (!req.file || !uploadId || chunkIndex === undefined || !fileName) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath || "/");
  const partFilePath = path.join(targetPath, fileName + '.part');

  if (!partFilePath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.ensureDir(targetPath);
    
    // If it's the first chunk, ensure we start fresh
    if (String(chunkIndex) === "0") {
      if (fs.existsSync(partFilePath)) {
        await fs.remove(partFilePath);
      }
    }

    // Read the uploaded chunk and append it
    const chunkData = await fs.readFile(req.file.path);
    await fs.appendFile(partFilePath, chunkData);
    
    // Cleanup multer temp file
    await fs.remove(req.file.path).catch(() => {});
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const completeUpload = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { uploadId, fileName, path: dirPath, totalChunks } = req.body;
  if (!uploadId || !fileName || !totalChunks) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath || "/");
  const finalFilePath = path.join(targetPath, fileName);
  const partFilePath = path.join(targetPath, fileName + '.part');
  
  if (!finalFilePath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    if (fs.existsSync(partFilePath)) {
      await fs.move(partFilePath, finalFilePath, { overwrite: true });
    } else {
      // In case totalChunks was 0 or something weird, but usually part file must exist.
      throw new Error("Part file missing");
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  let dirPath = req.body.path || "/";
  
  // If dirPath matches or ends with the uploaded file name, normalize to parent directory
  if (req.file) {
    if (dirPath === req.file.originalname || dirPath === `/${req.file.originalname}` || dirPath === `\\${req.file.originalname}`) {
      dirPath = "/";
    } else if (dirPath.endsWith(req.file.originalname)) {
      dirPath = path.dirname(dirPath);
    }
  }

  const serverBase = path.join(process.cwd(), ".data", "servers", id);
  const targetPath = path.join(serverBase, dirPath);
  
  if (!targetPath.startsWith(serverBase)) {
    return res.status(403).json({ error: "Invalid path" });
  }

  if (req.file) {
    await fs.ensureDir(targetPath);
    const destFile = path.join(targetPath, req.file.originalname);
    await fs.move(req.file.path, destFile, { overwrite: true });
  }
  res.json({ success: true });
};

export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const filePaths = req.body.paths || (req.body.path ? [req.body.path] : []);
  
  try {
    for (const filePath of filePaths) {
      const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
      
      if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
        return res.status(403).json({ error: "Invalid path" });
      }
      
      await fs.remove(targetPath);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const zipFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dirPath, fileNames, outputName } = req.body;
  
  const baseDir = path.join(process.cwd(), ".data", "servers", id, dirPath);
  const outZipPath = path.join(baseDir, outputName || "archive.zip");

  if (!baseDir.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const output = fs.createWriteStream(outZipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => {
      res.json({ success: true, filename: outputName || "archive.zip" });
    });

    archive.on("error", (err: any) => {
      console.error("Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    archive.pipe(output);

    for (const name of fileNames) {
      const filePath = path.join(baseDir, name);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        archive.directory(filePath, name);
      } else {
        archive.file(filePath, { name });
      }
    }

    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const renameFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { oldPath, newPath } = req.body;

  const targetOldPath = path.join(process.cwd(), ".data", "servers", id, oldPath);
  const targetNewPath = path.join(process.cwd(), ".data", "servers", id, newPath);

  if (!targetOldPath.startsWith(path.join(process.cwd(), ".data", "servers", id)) ||
      !targetNewPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.rename(targetOldPath, targetNewPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export const downloadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  let rawPaths: string[] = [];
  if (req.query.paths) {
    rawPaths = Array.isArray(req.query.paths) ? (req.query.paths as string[]) : String(req.query.paths).split(",");
  } else if (req.query.path) {
    rawPaths = [String(req.query.path)];
  }

  if (rawPaths.length === 0) {
    return res.status(400).json({ error: "No path specified" });
  }

  const serverBaseDir = path.join(process.cwd(), ".data", "servers", id);

  try {
    if (rawPaths.length === 1) {
      const singlePath = rawPaths[0];
      const targetPath = path.join(serverBaseDir, singlePath);

      if (!targetPath.startsWith(serverBaseDir)) {
        return res.status(403).json({ error: "Invalid path" });
      }

      const stat = await fs.stat(targetPath);
      if (!stat.isDirectory()) {
        return res.download(targetPath, path.basename(targetPath));
      }
    }

    // Multiple items OR a single directory -> stream as ZIP
    const zipName = rawPaths.length === 1 
      ? `${path.basename(rawPaths[0]) || "folder"}.zip`
      : `download-${Date.now()}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err: any) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    archive.pipe(res);

    for (const relPath of rawPaths) {
      const targetPath = path.join(serverBaseDir, relPath);
      if (!targetPath.startsWith(serverBaseDir)) continue;
      const itemName = path.basename(targetPath);
      const stat = await fs.stat(targetPath).catch(() => null);
      if (!stat) continue;

      if (stat.isDirectory()) {
        archive.directory(targetPath, itemName);
      } else {
        archive.file(targetPath, { name: itemName });
      }
    }

    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const unzipFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { path: filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "Archive file path is required" });
  }

  const serverBaseDir = path.join(process.cwd(), ".data", "servers", id);
  let targetPath = path.join(serverBaseDir, filePath);
  
  if (!targetPath.startsWith(serverBaseDir)) {
    return res.status(403).json({ error: "Invalid path: Access outside server directory is forbidden" });
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }

  try {
    const stat = await fs.stat(targetPath);
    
    // If targetPath is a directory (e.g. a folder named 'Stad 2_0.zip')
    if (stat.isDirectory()) {
      const baseName = path.basename(targetPath);
      const nestedFilePath = path.join(targetPath, baseName);
      
      // Check if there is an actual archive file inside this folder with the same name
      if (fs.existsSync(nestedFilePath) && (await fs.stat(nestedFilePath)).isFile()) {
        targetPath = nestedFilePath;
      } else {
        // Look for any archive file inside this directory
        const filesInside = await fs.readdir(targetPath);
        const archiveInside = filesInside.find(f => /\.(zip|tar|gz|tgz|jar|rar|7z)$/i.test(f));
        if (archiveInside) {
          targetPath = path.join(targetPath, archiveInside);
        } else {
          return res.status(400).json({ error: `'${filePath}' is a folder directory, not an archive file.` });
        }
      }
    }

    const destDir = path.dirname(targetPath);
    const result = await extractArchive(targetPath, destDir);
    res.json({ success: true, method: result.method });
  } catch (e: any) {
    console.error("Extraction error:", e);
    res.status(500).json({ error: e.message || "Failed to extract archive file" });
  }
};


export const createFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }
  try {
    await fs.writeFile(targetPath, "", "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createDirectory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }
  try {
    await fs.mkdir(targetPath, { recursive: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const saveFileContent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath, content } = req.body;

  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);

  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.writeFile(targetPath, content, "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export const getBackups = async (req: Request, res: Response) => {
  const { id } = req.params;
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  await fs.ensureDir(backupsDir);

  try {
    const files = await fs.readdir(backupsDir);
    const backups = [];
    for (const file of files) {
      if (file.endsWith(".zip")) {
        const stats = await fs.stat(path.join(backupsDir, file));
        backups.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
        });
      }
    }
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(backups);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createBackup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  await fs.ensureDir(backupsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.zip`;
  const backupPath = path.join(backupsDir, filename);

  try {
    const serverExists = await fs.pathExists(serverDir);
    if (!serverExists) {
       await fs.ensureDir(serverDir); // ensure it acts properly if empty
    }

    const output = fs.createWriteStream(backupPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => {
      if (!res.headersSent) res.json({ success: true, filename });
    });

    archive.on("error", (err: any) => {
      console.error("Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    archive.pipe(output);
    archive.directory(serverDir, false);
    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const downloadBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const backupPath = path.join(process.cwd(), ".data", "backups", id, filename);

  // basic path traversal prevention
  if (!backupPath.startsWith(path.join(process.cwd(), ".data", "backups", id))) {
    return res.status(403).send("Invalid path");
  }

  if (await fs.pathExists(backupPath)) {
    res.download(backupPath);
  } else {
    res.status(404).send("Backup not found");
  }
};

export const deleteBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const backupPath = path.join(process.cwd(), ".data", "backups", id, filename);

  if (!backupPath.startsWith(path.join(process.cwd(), ".data", "backups", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.remove(backupPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
export const installPlugin = async (req: Request, res: Response) => {

  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const pluginCompatibleTypes = ["PAPER", "SPIGOT", "BUKKIT", "PURPUR", "WATERFALL", "BUNGEECORD", "VELOCITY"];
  if (!pluginCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Bukkit/Spigot plugins on a ${server.type} server. This software does not support Bukkit plugins.` });
  }
  const { source, pluginId, pluginName } = req.body;
  
  // Allow direct downloadUrl fallback for backward compatibility
  if (req.body.downloadUrl) {
     try {
        const serverDir = path.join(process.cwd(), ".data", "servers", id);
        const pluginsDir = path.join(serverDir, "plugins");
        await fs.ensureDir(pluginsDir);
        const filePath = path.join(pluginsDir, req.body.filename);
        if (req.body.downloadUrl === 'dummy') {
          await fs.writeFile(filePath, '');
        } else {
          const axios = (await import("axios")).default;
          const response = await axios({ url: req.body.downloadUrl, method: 'GET', responseType: 'stream' });
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          await new Promise<void>((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        }
        return res.json({ success: true, message: "Plugin installed successfully" });
     } catch(e) {
        return res.status(500).json({ error: "Failed to install plugin" });
     }
  }

  if (!source || !pluginId || !pluginName) {
    return res.status(400).json({ error: "Missing source, pluginId, or pluginName" });
  }

  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const pluginsDir = path.join(serverDir, "plugins");
    await fs.ensureDir(pluginsDir);
    
    let downloadUrl = null;
    let filename = `${pluginName.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const axios = (await import("axios")).default;

    const resolveGithubRelease = async (extUrl: string) => {
      if (extUrl.includes('github.com') && extUrl.includes('/releases/')) {
        let apiUrl = null;
        const match = extUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/([^\/]+)/);
        if (match) {
          apiUrl = `https://api.github.com/repos/${match[1]}/${match[2]}/releases/tags/${match[3]}`;
        } else {
          const matchLatest = extUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases\/latest/);
          if (matchLatest) {
            apiUrl = `https://api.github.com/repos/${matchLatest[1]}/${matchLatest[2]}/releases/latest`;
          }
        }
        if (apiUrl) {
          try {
            const ghRes = await axios.get(apiUrl);
            if (ghRes.data && ghRes.data.assets) {
              const jarAsset = ghRes.data.assets.find((a: any) => a.name.endsWith('.jar'));
              if (jarAsset) {
                return { url: jarAsset.browser_download_url, filename: jarAsset.name };
              }
            }
          } catch(e) {
            console.error('GitHub API error:', e);
          }
        }
      }
      return null;
    };

    if (source === 'modrinth') {
      const verRes = await axios.get(`https://api.modrinth.com/v2/project/${pluginId}/version`);
      if (verRes.data && verRes.data.length > 0) {
        const file = verRes.data[0].files.find((f: any) => f.primary) || verRes.data[0].files[0];
        if (file) {
           downloadUrl = file.url;
           filename = file.filename || filename;
        }
      }
    } else if (source === 'spigot') {
       const apiRes = await axios.get(`https://api.spiget.org/v2/resources/${pluginId}`);
       if (apiRes.data && apiRes.data.file) {
         if (apiRes.data.file.type === 'external' && apiRes.data.file.externalUrl) {
           const extUrl = apiRes.data.file.externalUrl;
           const ghAsset = await resolveGithubRelease(extUrl);
           if (ghAsset) {
             downloadUrl = ghAsset.url;
             filename = ghAsset.filename;
           }
           if (!downloadUrl) {
             return res.status(400).json({ error: "This plugin must be downloaded externally from: " + extUrl });
           }
         } else {
           downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
         }
       } else {
         downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
       }
    } else if (source === 'hangar') {
       const [owner, slug] = pluginId.split('/');
       const verRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions`);
       if (verRes.data && verRes.data.result && verRes.data.result.length > 0) {
         const version = verRes.data.result[0];
         const download = version.downloads.PAPER || Object.values(version.downloads)[0];
         if (download && (download as any).downloadUrl) {
            downloadUrl = (download as any).downloadUrl;
            if ((download as any).fileInfo && (download as any).fileInfo.name) {
                filename = (download as any).fileInfo.name;
            }
         } else if (download && (download as any).externalUrl) {
            const extUrl = (download as any).externalUrl;
            const ghAsset = await resolveGithubRelease(extUrl);
            if (ghAsset) {
              downloadUrl = ghAsset.url;
              filename = ghAsset.filename;
            } else {
              return res.status(400).json({ error: "This plugin must be downloaded externally from: " + extUrl });
            }
         }
       }
    }

    if (!downloadUrl) {
      return res.status(404).json({ error: "Could not find a valid download URL for this plugin." });
    }

    const filePath = path.join(pluginsDir, filename);
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
         'User-Agent': 'React-Minecraft-Panel/1.0'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({ success: true, message: "Plugin installed successfully" });
  } catch (error: any) {
    console.error("Plugin installation failed:", error.message);
    res.status(500).json({ error: "Plugin installation failed: " + error.message });
  }
};

export const installMod = async (req: Request, res: Response) => {

  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const modCompatibleTypes = ["FABRIC", "FORGE", "NEOFORGE", "QUILT"];
  if (!modCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Fabric/Forge mods on a ${server.type} server. This software does not support Fabric/Forge mods.` });
  }
  const { pluginId, pluginName } = req.body; 

  if (!pluginId || !pluginName) {
    return res.status(400).json({ error: "Missing pluginId or pluginName" });
  }

  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const modsDir = path.join(serverDir, "mods");
    await fs.ensureDir(modsDir);
    
    let downloadUrl = null;
    let filename = `${pluginName.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const axios = (await import("axios")).default;

    const verRes = await axios.get(`https://api.modrinth.com/v2/project/${pluginId}/version`);
    if (verRes.data && verRes.data.length > 0) {
      const file = verRes.data[0].files.find((f: any) => f.primary) || verRes.data[0].files[0];
      if (file) {
          downloadUrl = file.url;
          filename = file.filename || filename;
      }
    }

    if (!downloadUrl) {
      return res.status(404).json({ error: "Could not find a valid download URL for this mod." });
    }

    const filePath = path.join(modsDir, filename);
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
         'User-Agent': 'React-Minecraft-Panel/1.0'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({ success: true, message: "Mod installed successfully" });
  } catch (error: any) {
    console.error("Mod installation failed:", error.message);
    res.status(500).json({ error: "Mod installation failed: " + error.message });
  }
};

export const updateResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ram, cpu, disk } = req.body;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

    server.ram = Number(ram);
    server.cpu = Number(cpu);
    server.disk = Number(disk);
    await writeJSON("servers.json", servers);

    // Stop container if running
    if (server.containerId) {
       try {
         await stopServerRuntime(server);
       } catch(e) {}
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ error: "Failed to update resources" });
  }
};

export const updateSuspend = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suspendDuration } = req.body; // permanent, 1_month, 2_months, 24_hours, 1_week, or null
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

    server.suspended = suspendDuration !== null;
    server.suspendDuration = suspendDuration;
    await writeJSON("servers.json", servers);

    if (server.suspended && server.containerId) {
       try {
         await stopServerRuntime(server);
       } catch(e) {}
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ error: "Failed to suspend server" });
  }
};






export const updateRuntime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version, type, javaVersion, dockerImage, serverJar, startupCommand } = req.body;
    const user = (req as any).user;

    let servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) return res.status(404).json({ error: "Server not found" });
    const server = servers[serverIndex];

    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can change runtime settings" });
    }

    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        return res.status(400).json({ error: "Server must be stopped before changing runtime. Please stop the server first." });
      }
    }
    
    // We must do a full backup before changing this if requested, but for now we just save it.
    // The instructions say "When an administrator changes the Minecraft version: 1. Stop the server safely... 3. Create a complete backup."
    // Let's call the internal backup logic.
    const backupDir = path.join(process.cwd(), ".data", "backups", id);
    await fs.ensureDir(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `pre_runtime_update_${timestamp}.zip`);
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    

    if (await fs.pathExists(serverDir)) {
      const archiver = require("archiver");
      const output = fs.createWriteStream(backupFile);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);
      archive.directory(serverDir, false);
      
      const serversJSON = await readJSON("servers.json");
      archive.append(JSON.stringify(serversJSON.find((s: any) => s.id === id), null, 2), { name: "server_config_snapshot.json" });
      
      await archive.finalize();
    }


    server.version = version || server.version;
    server.type = type || server.type;
    server.javaVersion = javaVersion || server.javaVersion;
    server.dockerImage = dockerImage || server.dockerImage;
    server.serverJar = serverJar || server.serverJar;
    server.startupCommand = startupCommand || server.startupCommand;

    servers[serverIndex] = server;
    
    if (server.containerId) {
       await deleteServerRuntime(server);
    }
    
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    servers[serverIndex] = server;

    await writeJSON("servers.json", servers);

    res.json({ success: true, server });
  } catch (err: any) {
    console.error("Update runtime error", err);
    res.status(500).json({ error: err.message });
  }
};

export const migrateServerRuntime = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetRuntime } = req.body;
  const user = (req as any).user;

  try {
    if (!targetRuntime || (targetRuntime !== "docker" && targetRuntime !== "local")) {
      return res.status(400).json({ error: "Invalid target runtime. Must be 'docker' or 'local'." });
    }

    const servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) {
      return res.status(404).json({ error: "Server not found" });
    }

    const server = servers[serverIndex];
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can migrate runtime" });
    }

    // Check if server is running
    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        return res.status(400).json({ error: "Server must be stopped before migrating runtime. Please stop the server first." });
      }
      // Clean up old runtime instance (container or local process state)
      await deleteServerRuntime(server);
    }

    // Update runtime type
    server.runtimeType = targetRuntime;

    // Create the new runtime container/process metadata
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    servers[serverIndex] = server;

    await writeJSON("servers.json", servers);
    res.json({ success: true, server, runtimeType: targetRuntime });
  } catch (err: any) {
    console.error("Migrate runtime error:", err);
    res.status(500).json({ error: err.message || "Failed to migrate server runtime" });
  }
};



export const restoreBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  const backupPath = path.join(backupsDir, filename);

  try {
    if (!(await fs.pathExists(backupPath))) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const status = await getServerRuntimeStatus({ id } as any);
    if (status?.State?.Running) {
      return res.status(400).json({ error: "Please stop the server before restoring a backup." });
    }

    // Clean current directory except some critical things if needed, but for full restore, we empty it
    await fs.emptyDir(serverDir);

    const extract = require("extract-zip");
    await extract(backupPath, { dir: serverDir });
    
    // Check if there was a server_config_snapshot.json and apply it
    const configSnapshot = path.join(serverDir, "server_config_snapshot.json");
    if (fs.existsSync(configSnapshot)) {
        const oldConfig = await readJSON(configSnapshot);
        const servers = await readJSON("servers.json");
        const idx = servers.findIndex((s: any) => s.id === id);
        if (idx !== -1) {
            servers[idx] = { ...servers[idx], ...oldConfig };
            await writeJSON("servers.json", servers);
        }
        await fs.remove(configSnapshot);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
