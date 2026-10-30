import path from "path";
import fs from "fs-extra";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { open as openFile } from "fs/promises";
import { ensureCloudflaredBinary } from "./cloudflare.js";

const execFileAsync = promisify(execFile);

/**
 * Panel-level Cloudflare Tunnel management.
 *
 * The tunnel token is stored in a root-only file (0600). It is never included
 * in status responses, logs or process arguments (cloudflared reads it from
 * `--token-file`). The full token is only available through an admin-only
 * endpoint used by the "Show" button in the UI.
 */

const DATA_DIR = path.join(process.cwd(), ".data", "cloudflared");
const LOCAL_TOKEN_FILE = path.join(DATA_DIR, "token");
const SYSTEM_TOKEN_FILE = "/etc/cloudflared/token";
const PID_FILE = path.join(DATA_DIR, "tunnel.pid");
const LOG_FILE = path.join(DATA_DIR, "tunnel.log");
const SERVICE_NAME = "cloudflared";

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const isLinux = () => process.platform === "linux";

const tokenCandidates = (): string[] => {
  const list = [process.env.CLOUDFLARE_TOKEN_FILE, SYSTEM_TOKEN_FILE, LOCAL_TOKEN_FILE];
  return Array.from(new Set(list.filter((p): p is string => typeof p === "string" && p.length > 0)));
};

const stripAnsi = (value: string) => value.replace(ANSI_RE, "");

const redact = (value: string, token?: string | null) => {
  let output = stripAnsi(value || "");
  if (token) {
    output = output.split(token).join("[redacted]");
  }
  output = output.replace(/(--token(?:-file)?[=\s]+)\S+/gi, "$1[redacted]");
  output = output.replace(/\b(token\s*[=:]\s*)\S+/gi, "$1[redacted]");
  output = output.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted]");
  return output;
};

const run = async (cmd: string, args: string[], timeout = 10000) => {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      timeout,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout: stdout || "", stderr: stderr || "" };
  } catch (err: any) {
    return {
      ok: false,
      stdout: typeof err?.stdout === "string" ? err.stdout : "",
      stderr: typeof err?.stderr === "string" ? err.stderr : err?.message || String(err),
    };
  }
};

const tailFile = async (filePath: string, lines: number) => {
  try {
    if (!(await fs.pathExists(filePath))) return "";
    const content = await fs.readFile(filePath, "utf8");
    return content.split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
};

const readPid = async (): Promise<number | null> => {
  try {
    if (!(await fs.pathExists(PID_FILE))) return null;
    const raw = (await fs.readFile(PID_FILE, "utf8")).trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
};

const isPidAlive = (pid: number | null): boolean => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */
/*  Token handling                                                     */
/* ------------------------------------------------------------------ */

export const parseTunnelToken = (input: string): string => {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Tunnel token cannot be empty.");

  let token = "";
  if (/cloudflared/i.test(raw) && /\binstall\b/i.test(raw)) {
    const parts = raw.split(/\s+/);
    const index = parts.findIndex((part) => part === "install");
    let next = index >= 0 ? parts[index + 1] || "" : "";
    if (/^--token(=|$)/i.test(next)) {
      if (next.includes("=")) {
        next = next.split("=").slice(1).join("=");
      } else {
        next = parts[index + 2] || "";
      }
    }
    token = next;
    if (!token) throw new Error("Could not find a token after 'install' in the command.");
  } else if (/\s/.test(raw)) {
    throw new Error("Paste only the tunnel token, or the full 'cloudflared service install ...' command.");
  } else {
    token = raw;
  }

  token = token.replace(/^['"]|['"]$/g, "");
  if (!/^[A-Za-z0-9+/=_.-]{20,4096}$/.test(token)) {
    throw new Error("That does not look like a valid Cloudflare Tunnel token.");
  }
  return token;
};

const readServiceUnitToken = async (): Promise<string | null> => {
  if (!isLinux()) return null;
  const unitFiles = [
    "/etc/systemd/system/cloudflared.service",
    "/lib/systemd/system/cloudflared.service",
    "/usr/lib/systemd/system/cloudflared.service",
  ];

  for (const unitFile of unitFiles) {
    if (!(await fs.pathExists(unitFile))) continue;
    try {
      const unit = await fs.readFile(unitFile, "utf8");
      const tokenFileMatch = unit.match(/--token-file[=\s]+([^\s"']+)/);
      if (tokenFileMatch) {
        const tokenPath = tokenFileMatch[1];
        if (await fs.pathExists(tokenPath)) {
          const value = (await fs.readFile(tokenPath, "utf8")).trim();
          if (value) return value;
        }
      }
      const tokenMatch = unit.match(/--token[=\s]+([^\s"']+)/);
      if (tokenMatch) return tokenMatch[1];
    } catch {
      /* keep looking */
    }
  }
  return null;
};

export const getTunnelToken = async (): Promise<string | null> => {
  for (const candidate of tokenCandidates()) {
    try {
      if (await fs.pathExists(candidate)) {
        const value = (await fs.readFile(candidate, "utf8")).trim();
        if (value) return value;
      }
    } catch {
      /* try next candidate */
    }
  }
  return await readServiceUnitToken();
};

export const saveTunnelToken = async (token: string): Promise<string> => {
  await fs.ensureDir(DATA_DIR);
  const preferred: string[] = [];
  if (process.env.CLOUDFLARE_TOKEN_FILE) preferred.push(process.env.CLOUDFLARE_TOKEN_FILE);
  if (isLinux()) preferred.push(SYSTEM_TOKEN_FILE);
  preferred.push(LOCAL_TOKEN_FILE);

  let lastError: any = null;
  for (const target of preferred) {
    try {
      await fs.ensureDir(path.dirname(target));
      const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
      await fs.writeFile(temp, token, { encoding: "utf8", mode: 0o600 });
      await fs.chmod(temp, 0o600);
      await fs.move(temp, target, { overwrite: true });
      await fs.chmod(target, 0o600);
      return target;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Could not store the tunnel token securely: ${lastError?.message || "permission denied"}`
  );
};

const resolveTokenPath = async (): Promise<string | null> => {
  for (const candidate of tokenCandidates()) {
    try {
      if (await fs.pathExists(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  const unitToken = await readServiceUnitToken();
  if (unitToken) {
    for (const candidate of tokenCandidates()) {
      try {
        if (await fs.pathExists(candidate)) return candidate;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
};

/* ------------------------------------------------------------------ */
/*  Binary / service detection                                         */
/* ------------------------------------------------------------------ */

export const findCloudflaredBinary = async (): Promise<string | null> => {
  const probe = await run("cloudflared", ["--version"], 5000);
  if (probe.ok) return "cloudflared";

  const binName = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
  const localBin = path.join(process.cwd(), ".data", "bin", binName);
  if (await fs.pathExists(localBin)) return localBin;
  return null;
};

const serviceInstalled = async (): Promise<boolean> => {
  if (!isLinux()) return false;
  if (await fs.pathExists("/etc/systemd/system/cloudflared.service")) return true;
  const result = await run("systemctl", ["list-unit-files", `${SERVICE_NAME}.service`, "--no-pager"], 6000);
  return result.ok && result.stdout.includes(`${SERVICE_NAME}.service`);
};

const serviceActive = async (): Promise<boolean> => {
  if (!isLinux()) return false;
  const result = await run("systemctl", ["is-active", SERVICE_NAME], 5000);
  return result.ok && result.stdout.trim() === "active";
};

const serviceEnabled = async (): Promise<boolean> => {
  if (!isLinux()) return false;
  const result = await run("systemctl", ["is-enabled", SERVICE_NAME], 5000);
  return result.ok && result.stdout.trim() === "enabled";
};

/* ------------------------------------------------------------------ */
/*  Logs / status                                                      */
/* ------------------------------------------------------------------ */

const getTunnelLogs = async (lines = 120): Promise<string> => {
  let raw = "";
  if (isLinux() && (await serviceInstalled())) {
    const result = await run(
      "journalctl",
      ["-u", SERVICE_NAME, "-n", String(lines), "--no-pager", "-o", "cat"],
      8000
    );
    raw = result.ok ? result.stdout : result.stderr;
  } else {
    raw = await tailFile(LOG_FILE, lines);
  }
  return redact(raw, await getTunnelToken().catch(() => null));
};

const extractTunnelUrl = (logs: string): string | null => {
  const matches = logs.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
  return matches && matches.length > 0 ? matches[matches.length - 1] : null;
};

const extractError = (logs: string): string | null => {
  const lines = logs
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errorLine = [...lines]
    .reverse()
    .find((line) => /error|fatal|unauthorized|invalid token|failed|quitting/i.test(line));
  return errorLine ? errorLine.slice(0, 500) : null;
};

export interface TunnelStatus {
  status: "not-installed" | "not-configured" | "running" | "stopped" | "error";
  installed: boolean;
  binaryPath: string | null;
  serviceInstalled: boolean;
  serviceActive: boolean;
  serviceEnabled: boolean;
  managedProcess: boolean;
  running: boolean;
  connection: "connected" | "connecting" | "disconnected" | "error";
  tokenConfigured: boolean;
  tunnelUrl: string | null;
  lastError: string | null;
  logs: string;
  checkedAt: string;
}

export const getTunnelStatus = async (): Promise<TunnelStatus> => {
  const binaryPath = await findCloudflaredBinary();
  const installed = !!binaryPath;
  const hasService = await serviceInstalled();
  const active = await serviceActive();
  const enabled = await serviceEnabled();
  const pid = await readPid();
  const managed = isPidAlive(pid);
  const token = await getTunnelToken();
  const tokenConfigured = !!token;
  const running = active || managed;
  const logs = await getTunnelLogs(120);

  const connected = /registered tunnel connection|registered connindex|connection [0-9a-f-]+ registered/i.test(logs);
  const failed = /unauthorized|invalid token|cannot fetch tunnel|validation failed|quitting due to error|failed to/i.test(logs);
  const connection: TunnelStatus["connection"] = running
    ? connected
      ? "connected"
      : failed
        ? "error"
        : "connecting"
    : "disconnected";

  let status: TunnelStatus["status"];
  if (!installed && !hasService) status = "not-installed";
  else if (running) status = connection === "error" ? "error" : "running";
  else if (!tokenConfigured) status = "not-configured";
  else status = failed ? "error" : "stopped";

  return {
    status,
    installed,
    binaryPath,
    serviceInstalled: hasService,
    serviceActive: active,
    serviceEnabled: enabled,
    managedProcess: managed,
    running,
    connection,
    tokenConfigured,
    tunnelUrl: extractTunnelUrl(logs),
    lastError: failed ? extractError(logs) : null,
    logs,
    checkedAt: new Date().toISOString(),
  };
};

/* ------------------------------------------------------------------ */
/*  Process / service lifecycle                                        */
/* ------------------------------------------------------------------ */

const stopManagedProcess = async () => {
  const pid = await readPid();
  if (!pid || !isPidAlive(pid)) {
    await fs.remove(PID_FILE).catch(() => {});
    return;
  }

  if (process.platform === "win32") {
    await run("taskkill", ["/PID", String(pid), "/T", "/F"], 8000);
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    for (let i = 0; i < 20 && isPidAlive(pid); i++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (isPidAlive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }
  await fs.remove(PID_FILE).catch(() => {});
};

const startManagedProcess = async (binaryPath: string, tokenPath: string) => {
  await fs.ensureDir(DATA_DIR);
  await stopManagedProcess();

  const fd = await openFile(LOG_FILE, "a");
  const child = spawn(
    binaryPath,
    ["tunnel", "--no-autoupdate", "run", "--token-file", tokenPath],
    {
      detached: true,
      stdio: ["ignore", fd.fd, fd.fd],
      windowsHide: true,
      env: { ...process.env, NO_COLOR: "1" },
    }
  );

  const spawnState: { error: Error | null } = { error: null };
  child.once("error", (err) => {
    spawnState.error = err;
  });
  child.unref();
  await fd.close();

  if (child.pid) {
    await fs.writeFile(PID_FILE, String(child.pid), "utf8");
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (spawnState.error) {
    await fs.remove(PID_FILE).catch(() => {});
    throw new Error(`Failed to start cloudflared: ${spawnState.error.message}`);
  }
  if (!child.pid || !isPidAlive(child.pid)) {
    await fs.remove(PID_FILE).catch(() => {});
    const logs = redact(await tailFile(LOG_FILE, 40));
    throw new Error(`cloudflared exited immediately.${logs ? `\n${logs}` : ""}`);
  }

  return child.pid;
};

const ensureBinary = async (): Promise<string> => {
  const existing = await findCloudflaredBinary();
  if (existing) return existing;
  return await ensureCloudflaredBinary();
};

/**
 * Start (or restart) the panel tunnel. Optionally updates the token first.
 */
export const startTunnel = async (tokenInput?: string): Promise<TunnelStatus> => {
  let tokenPath: string | null = null;

  if (tokenInput && String(tokenInput).trim()) {
    const token = parseTunnelToken(String(tokenInput));
    tokenPath = await saveTunnelToken(token);
  } else {
    const token = await getTunnelToken();
    if (!token) throw new Error("No Cloudflare Tunnel token configured. Add a token first.");
    tokenPath = (await resolveTokenPath()) || (await saveTunnelToken(token));
  }

  if (isLinux() && (await serviceInstalled())) {
    await run("systemctl", ["daemon-reload"], 8000);
    await run("systemctl", ["enable", SERVICE_NAME], 8000);
    const restart = await run("systemctl", ["restart", SERVICE_NAME], 20000);
    if (!restart.ok) {
      const logs = await getTunnelLogs(40);
      throw new Error(redact(`${restart.stderr || "Failed to restart cloudflared service."}${logs ? `\n${logs}` : ""}`));
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!(await serviceActive())) {
      const logs = await getTunnelLogs(60);
      throw new Error(redact(`cloudflared service failed to start.${logs ? `\n${logs}` : ""}`));
    }
    return await getTunnelStatus();
  }

  const binary = await ensureBinary();
  await startManagedProcess(binary, tokenPath);
  return await getTunnelStatus();
};

export const stopTunnel = async (): Promise<TunnelStatus> => {
  if (isLinux() && (await serviceInstalled())) {
    await run("systemctl", ["stop", SERVICE_NAME], 20000);
  }
  await stopManagedProcess();
  return await getTunnelStatus();
};

export const restartTunnel = async (): Promise<TunnelStatus> => {
  return await startTunnel();
};

export const updateTunnelToken = async (tokenInput: string): Promise<TunnelStatus> => {
  const token = parseTunnelToken(tokenInput);
  await saveTunnelToken(token);
  return await startTunnel();
};
