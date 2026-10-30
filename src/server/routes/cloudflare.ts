import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getTunnelStatus,
  getTunnelToken,
  startTunnel,
  stopTunnel,
  restartTunnel,
  updateTunnelToken,
  parseTunnelToken,
} from "../services/tunnel.js";

const router = express.Router();

router.use(requireAuth);

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

router.use(adminOnly);

const noStore = (res: express.Response) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
};

const handleError = (res: express.Response, err: any, fallback: string) => {
  const message = err?.message || fallback;
  console.error(`[Cloudflare] ${fallback}: ${message}`);
  const status = /token|command|valid|empty/i.test(message) ? 400 : 500;
  res.status(status).json({ error: message });
};

router.get("/status", async (_req, res) => {
  try {
    noStore(res);
    res.json(await getTunnelStatus());
  } catch (err: any) {
    handleError(res, err, "Failed to read Cloudflare Tunnel status");
  }
});

// Full token for the admin-only "Show" button. Never cached.
router.get("/token", async (_req, res) => {
  try {
    noStore(res);
    const token = await getTunnelToken();
    if (!token) return res.status(404).json({ error: "No tunnel token configured" });
    res.json({ token });
  } catch (err: any) {
    handleError(res, err, "Failed to read Cloudflare Tunnel token");
  }
});

router.post("/token", async (req, res) => {
  try {
    const raw = req.body?.token;
    if (typeof raw !== "string" || !raw.trim()) {
      return res.status(400).json({ error: "Tunnel token is required" });
    }
    parseTunnelToken(raw);
    const status = await updateTunnelToken(raw);
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to update Cloudflare Tunnel token");
  }
});

router.post("/connect", async (req, res) => {
  try {
    const raw = req.body?.token;
    const status = await startTunnel(typeof raw === "string" && raw.trim() ? raw : undefined);
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to connect Cloudflare Tunnel");
  }
});

router.post("/start", async (req, res) => {
  try {
    const raw = req.body?.token;
    const status = await startTunnel(typeof raw === "string" && raw.trim() ? raw : undefined);
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to start Cloudflare Tunnel");
  }
});

router.post("/stop", async (_req, res) => {
  try {
    const status = await stopTunnel();
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to stop Cloudflare Tunnel");
  }
});

router.post("/restart", async (_req, res) => {
  try {
    const status = await restartTunnel();
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to restart Cloudflare Tunnel");
  }
});

router.post("/reconnect", async (req, res) => {
  try {
    const raw = req.body?.token;
    const status = typeof raw === "string" && raw.trim() ? await updateTunnelToken(raw) : await restartTunnel();
    noStore(res);
    res.json({ success: true, status });
  } catch (err: any) {
    handleError(res, err, "Failed to reconnect Cloudflare Tunnel");
  }
});

export default router;
