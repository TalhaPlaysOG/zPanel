import path from "path";
import fs from "fs-extra";
import axios from "axios";
import { exec } from "child_process";

export interface CloudflareConfig {
  mode: "quick" | "token";
  token?: string;
  protocol?: "tcp" | "udp" | "http";
  port?: number;
}

export interface CloudflareStatus {
  status: "running" | "stopped" | "checking" | "error";
  tunnelUrl: string | null;
  config: CloudflareConfig | null;
  logs: string;
}

const BIN_DIR = path.join(process.cwd(), ".data", "bin");

export async function ensureCloudflaredBinary(): Promise<string> {
  await fs.ensureDir(BIN_DIR);
  const isWin = process.platform === "win32";
  const binName = isWin ? "cloudflared.exe" : "cloudflared";
  const binPath = path.join(BIN_DIR, binName);

  if (await fs.pathExists(binPath)) {
    return binPath;
  }

  // Determine platform URL
  let downloadUrl = "";
  const arch = process.arch;

  if (isWin) {
    downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
  } else if (process.platform === "darwin") {
    downloadUrl = arch === "arm64"
      ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64"
      : "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64";
  } else {
    // Linux
    downloadUrl = arch === "arm64"
      ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
      : "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";
  }

  console.log(`[Cloudflare] Downloading cloudflared from ${downloadUrl}...`);
  const response = await axios({
    method: "GET",
    url: downloadUrl,
    responseType: "stream",
    timeout: 60000,
  });

  const tempPath = `${binPath}.tmp-${Date.now()}`;
  const writer = fs.createWriteStream(tempPath);
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  await fs.move(tempPath, binPath, { overwrite: true });
  if (!isWin) {
    await fs.chmod(binPath, 0o755);
  }

  console.log(`[Cloudflare] Successfully downloaded cloudflared to ${binPath}`);
  return binPath;
}

export async function getCloudflareConfig(serverId: string): Promise<CloudflareConfig | null> {
  const configFile = path.join(process.cwd(), ".data", "servers", serverId, "cloudflare.json");
  if (await fs.pathExists(configFile)) {
    try {
      return await fs.readJSON(configFile);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveCloudflareConfig(serverId: string, config: CloudflareConfig): Promise<void> {
  const serverDir = path.join(process.cwd(), ".data", "servers", serverId);
  await fs.ensureDir(serverDir);
  const configFile = path.join(serverDir, "cloudflare.json");
  await fs.writeJSON(configFile, config, { spaces: 2 });
}

export async function deleteCloudflareConfig(serverId: string): Promise<void> {
  const configFile = path.join(process.cwd(), ".data", "servers", serverId, "cloudflare.json");
  await fs.remove(configFile);
}

export function getPm2ProcessName(server: any, serverId: string): string {
  const serverName = server && server.name ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : serverId;
  return `cf_${serverName}`;
}

export async function getCloudflareStatus(serverId: string, server: any): Promise<CloudflareStatus> {
  const pm2Name = getPm2ProcessName(server, serverId);
  const config = await getCloudflareConfig(serverId);

  return new Promise<CloudflareStatus>((resolve) => {
    exec("npx pm2 jlist", (err, stdout) => {
      let status: "running" | "stopped" | "checking" | "error" = "stopped";
      try {
        const jsonStart = stdout.indexOf("[");
        const jsonEnd = stdout.lastIndexOf("]");
        const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? stdout.substring(jsonStart, jsonEnd + 1) : stdout;
        const pm2List = JSON.parse(jsonStr);
        const cfProcess = pm2List.find((p: any) => p.name === pm2Name);
        if (cfProcess && cfProcess.pm2_env && cfProcess.pm2_env.status === "online") {
          status = "running";
        }
      } catch {
        status = "stopped";
      }

      if (status === "running") {
        exec(`npx pm2 logs ${pm2Name} --nostream --lines 120`, (logErr, logStdout, logStderr) => {
          const rawLogs = (logStdout || logStderr || "").replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b./g, "");
          const urlMatches = rawLogs.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
          const tunnelUrl = urlMatches && urlMatches.length > 0 ? urlMatches[urlMatches.length - 1] : null;

          resolve({
            status,
            tunnelUrl,
            config,
            logs: rawLogs.split("\n").slice(-80).join("\n")
          });
        });
      } else {
        resolve({
          status: "stopped",
          tunnelUrl: null,
          config,
          logs: ""
        });
      }
    });
  });
}

export async function startCloudflareTunnel(
  serverId: string,
  server: any,
  config: CloudflareConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const binPath = await ensureCloudflaredBinary();
    const pm2Name = getPm2ProcessName(server, serverId);

    await saveCloudflareConfig(serverId, config);

    const protocol = config.protocol || "tcp";
    const port = config.port || server?.port || 25565;

    let args: string[] = [];
    if (config.mode === "token" && config.token) {
      args = ["tunnel", "run", "--token", config.token.trim()];
    } else {
      // Quick Tunnel
      args = ["tunnel", "--url", `${protocol}://localhost:${port}`];
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      // Delete existing PM2 process if any, then start
      const startCmd = `npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true; npx pm2 start "${binPath}" --name "${pm2Name}" -- ${args.join(" ")} && npx pm2 save`;

      exec(startCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("[Cloudflare] Start tunnel error:", stderr || err.message);
          return resolve({ success: false, error: stderr || err.message });
        }
        resolve({ success: true });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to start Cloudflare tunnel" };
  }
}

export async function stopCloudflareTunnel(serverId: string, server: any): Promise<{ success: boolean }> {
  const pm2Name = getPm2ProcessName(server, serverId);
  return new Promise<{ success: boolean }>((resolve) => {
    exec(`npx pm2 delete ${pm2Name} && npx pm2 save`, () => {
      resolve({ success: true });
    });
  });
}

export async function resetCloudflareTunnel(serverId: string, server: any): Promise<{ success: boolean }> {
  const pm2Name = getPm2ProcessName(server, serverId);
  await deleteCloudflareConfig(serverId);
  return new Promise<{ success: boolean }>((resolve) => {
    exec(`npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true; npx pm2 save`, () => {
      resolve({ success: true });
    });
  });
}
