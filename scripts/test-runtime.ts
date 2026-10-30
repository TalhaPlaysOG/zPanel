import path from "path";
import fs from "fs-extra";
import {
  startLocalServer,
  stopLocalServer,
  getLocalServerStatus,
  getLocalServerLogs,
  sendLocalServerCommand,
  deleteLocalServer,
} from "../src/server/services/local.js";
import { getTunnelStatus, parseTunnelToken } from "../src/server/services/tunnel.js";

const id = `testmc-${Date.now()}`;
const server = {
  id,
  name: "Runtime Verification",
  type: "PAPER",
  version: "latest",
  ram: 1,
  port: 25599,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => Promise<boolean>, timeoutMs: number, label: string) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return true;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const main = async () => {
  console.log("== Token parsing ==");
  const token = "eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoifQ.abcdefghijklmnop.qrstuvwxyz012345";
  const cases = [
    token,
    `sudo cloudflared service install ${token}`,
    `cloudflared service install --token ${token}`,
    `  ${token}  `,
  ];
  for (const input of cases) {
    const parsed = parseTunnelToken(input);
    console.log(`parsed=${parsed === token} input=${input.slice(0, 34)}...`);
    if (parsed !== token) throw new Error("Token parse mismatch");
  }
  for (const bad of ["", "sudo apt install foo", "not a token", "abc"]) {
    let rejected = false;
    try {
      parseTunnelToken(bad);
    } catch {
      rejected = true;
    }
    console.log(`rejected=${rejected} input=${JSON.stringify(bad)}`);
    if (!rejected) throw new Error(`Expected rejection for ${JSON.stringify(bad)}`);
  }

  console.log("== Tunnel status ==");
  const tunnel = await getTunnelStatus();
  console.log({
    status: tunnel.status,
    installed: tunnel.installed,
    serviceInstalled: tunnel.serviceInstalled,
    tokenConfigured: tunnel.tokenConfigured,
    running: tunnel.running,
  });

  console.log("== Local Minecraft runtime ==");
  try {
    const start = await startLocalServer(id, server);
    console.log("start returned:", start);
    try {
      await waitFor(async () => {
        const current = await getLocalServerStatus(id);
        if (current.State.Status === "error") {
          const logs = await getLocalServerLogs(id, 200);
          throw new Error(`Runtime error: ${current.State.Error}\n${logs.split(/\r?\n/).slice(-40).join("\n")}`);
        }
        return current.State.Status === "online";
      }, 300000, "Minecraft online");
    } catch (waitErr) {
      const current = await getLocalServerStatus(id);
      const logs = await getLocalServerLogs(id, 300);
      console.error("STATUS:", current.State);
      console.error("---- LOGS ON FAILURE ----");
      console.error(logs.split(/\r?\n/).slice(-80).join("\n"));
      console.error("---- END LOGS ----");
      throw waitErr;
    }
    console.log("status:", (await getLocalServerStatus(id)).State);

    await sendLocalServerCommand(id, "list");
    await sleep(4000);
    const logs = await getLocalServerLogs(id, 200);
    console.log("---- LOG TAIL ----");
    console.log(logs.split(/\r?\n/).slice(-40).join("\n"));
    console.log("---- END LOGS ----");
    if (!/Done \(/i.test(logs)) throw new Error("Missing Minecraft startup completion log");
    if (!/players online|There are \d+ of a max of/i.test(logs)) {
      console.log("WARN: list command response not found in tail (may be below tail window)");
    }

    await stopLocalServer(id);
    const stopped = await getLocalServerStatus(id);
    console.log("stopped status:", stopped.State);
    if (stopped.State.Running || stopped.State.Status !== "offline") {
      throw new Error("Server did not stop cleanly");
    }
    const history = await getLocalServerLogs(id, 300);
    if (!history.trim()) throw new Error("Historical logs are empty after stop");
    console.log("history length:", history.split(/\r?\n/).length);
  } finally {
    await deleteLocalServer(id).catch(() => {});
    await fs.remove(path.join(process.cwd(), ".data", "servers", id)).catch(() => {});
  }
};

main()
  .then(() => {
    console.log("ALL RUNTIME CHECKS PASSED");
    process.exit(0);
  })
  .catch((err) => {
    console.error("RUNTIME CHECK FAILED:", err);
    process.exit(1);
  });
