import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import fs from "fs-extra";
import jwt from "jsonwebtoken";

const app = express();
app.set("trust proxy", true);
const httpServer = createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});
app.set("io", io);

// Initialize data folders
const DATA_DIR = path.join(process.cwd(), ".data");
const SERVERS_DIR = path.join(DATA_DIR, "servers");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(SERVERS_DIR);
fs.ensureDirSync(BACKUPS_DIR);
fs.ensureDirSync(path.join(DATA_DIR, "temp"));

if (!fs.existsSync(path.join(DATA_DIR, "users.json"))) fs.writeFileSync(path.join(DATA_DIR, "users.json"), "[]");
if (!fs.existsSync(path.join(DATA_DIR, "servers.json"))) fs.writeFileSync(path.join(DATA_DIR, "servers.json"), "[]");
if (!fs.existsSync(path.join(DATA_DIR, "settings.json"))) fs.writeFileSync(path.join(DATA_DIR, "settings.json"), "{}");

import { attachServerRuntimeSocket, getServerRuntimeLogs, sendServerRuntimeCommand, getServerRuntimeStatus } from "./src/server/services/runtime.js";
import { panelEvents } from "./src/server/events.js";

panelEvents.on("log", (serverId, data) => {
  io.to(`server_${serverId}`).emit("log", data);
});

panelEvents.on("status", (serverId, payload) => {
  io.to(`server_${serverId}`).emit("server_status", payload);
});

const loadServers = async (): Promise<any[]> => {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "servers.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const canAccessServer = (user: any, server: any) => {
  if (!user || !server) return false;
  if (user.role === "admin" || user.role === "owner") return true;
  if (server.owner && server.owner === user.id) return true;
  return Array.isArray(server.subUsers) && server.subUsers.some((su: any) => su.userId === user.id);
};

const authenticateSocket = async (socket: any, next: (err?: Error) => void) => {
  // Support token from multiple sources: auth object, query string, or Authorization header
  const rawToken =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");

  if (!rawToken) return next(new Error("Authentication error"));

  // --- Try JWT first ---
  try {
    const verified: any = jwt.verify(rawToken, process.env.JWT_SECRET || "zpanel-super-secret");

    // Make sure the account still exists and the session has not been revoked.
    if (verified.id !== "temp-admin") {
      const users = JSON.parse(await fs.readFile(path.join(DATA_DIR, "users.json"), "utf8").catch(() => "[]"));
      const user = Array.isArray(users) ? users.find((u: any) => u.id === verified.id) : null;
      if (!user) return next(new Error("Authentication error"));
      if ((user.passwordVersion || 0) !== (verified.passwordVersion || 0)) {
        return next(new Error("Session expired"));
      }
      verified.role = user.role || verified.role;
    }

    socket.user = verified;
    return next();
  } catch {
    // JWT verification failed — try API key fallback
  }

  // --- Try API key ---
  try {
    const users = JSON.parse(await fs.readFile(path.join(DATA_DIR, "users.json"), "utf8").catch(() => "[]"));
    const user = Array.isArray(users) ? users.find((u: any) => u.apiKey && u.apiKey === rawToken) : null;
    if (!user) return next(new Error("Authentication error"));
    socket.user = { id: user.id, role: user.role, username: user.username };
    return next();
  } catch {
    return next(new Error("Authentication error"));
  }
};

io.use(authenticateSocket);

io.on("connection", (socket) => {
  const joinedServers = new Set<string>();

  const emitStatusFor = async (serverId: string) => {
    const servers = await loadServers();
    const server = servers.find((s: any) => s.id === serverId);
    if (!server) return;
    try {
      const status = await getServerRuntimeStatus(server);
      const state = status?.State as any;
      socket.emit("server_status", {
        id: serverId,
        status: state?.Status || "offline",
        running: !!state?.Running,
        startedAt: state?.StartedAt || null,
        readyAt: state?.ReadyAt || null,
        error: state?.Error || null,
      });
    } catch {
      /* ignore */
    }
  };

  socket.on("joinServer", async (serverId: string, ack?: (response: any) => void) => {
    try {
      if (!serverId || typeof serverId !== "string" || !/^[a-zA-Z0-9-]{6,64}$/.test(serverId)) {
        ack?.({ success: false, error: "Invalid server id" });
        return;
      }

      const servers = await loadServers();
      const server = servers.find((s: any) => s.id === serverId);
      if (!server) {
        ack?.({ success: false, error: "Server not found" });
        return;
      }
      if (!canAccessServer((socket as any).user, server)) {
        ack?.({ success: false, error: "Forbidden" });
        return;
      }

      socket.join(`server_${serverId}`);
      joinedServers.add(serverId);

      // Historical logs (real Minecraft logs when available).
      const history = await getServerRuntimeLogs(server, 300).catch(() => "");
      socket.emit("logs_history", {
        serverId,
        logs: history ? history.split(/\r?\n/) : [],
      });

      // Attach the live runtime stream if the server is running.
      const status = await getServerRuntimeStatus(server).catch(() => null);
      if (status?.State?.Running) {
        await attachServerRuntimeSocket(server, serverId);
      }

      await emitStatusFor(serverId);
      ack?.({ success: true });
    } catch (err: any) {
      console.error("joinServer error", err);
      ack?.({ success: false, error: "Failed to join server console" });
    }
  });

  socket.on("leaveServer", (serverId: string) => {
    if (typeof serverId !== "string") return;
    socket.leave(`server_${serverId}`);
    joinedServers.delete(serverId);
  });

  socket.on("request_status", async (serverId: string) => {
    if (!joinedServers.has(serverId)) return;
    await emitStatusFor(serverId);
  });

  socket.on("command", async (payload: any, ack?: (response: any) => void) => {
    try {
      const serverId = payload?.serverId;
      const command = typeof payload?.command === "string" ? payload.command.trim() : "";
      if (!serverId || !command) {
        ack?.({ success: false, error: "Command is required" });
        return;
      }
      if (!joinedServers.has(serverId)) {
        ack?.({ success: false, error: "Join the server console first" });
        return;
      }
      if (command.length > 2000 || /[\r\n]/.test(command)) {
        ack?.({ success: false, error: "Invalid command" });
        return;
      }

      const servers = await loadServers();
      const server = servers.find((s: any) => s.id === serverId);
      if (!server) {
        ack?.({ success: false, error: "Server not found" });
        return;
      }
      if (!canAccessServer((socket as any).user, server)) {
        ack?.({ success: false, error: "Forbidden" });
        return;
      }

      await sendServerRuntimeCommand(server, command);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err.message || "Failed to send command" });
    }
  });

  socket.on("disconnect", () => {
    joinedServers.clear();
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 6767;

app.use(express.json({ limit: "50gb" }));
app.use(express.urlencoded({ extended: true, limit: "50gb" }));
app.use(cors());

import apiRoutes from "./src/server/routes/api.js";
app.use("/api", apiRoutes);

import { initSFTPServer } from "./src/server/services/sftp.js";

async function startServer() {
  await initSFTPServer();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: ["gtk.qzz.io"] },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`zPanel running on port ${PORT}`);
  });
}




// Only start the HTTP/socket server when this file is executed directly —
// never when it is imported as a module (e.g., by tests or build tools).
const isMain =
  (typeof require !== "undefined" && require.main === module) ||
  (process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs") || process.argv[1].endsWith("server.js")));

if (isMain) {
  startServer();
}


process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  fs.writeFileSync('crash.log', String(err.stack));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  fs.writeFileSync('crash.log', String(reason));
});
