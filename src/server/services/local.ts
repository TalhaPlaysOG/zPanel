import fs from "fs-extra";
import path from "path";
import net from "net";
import { spawn, ChildProcess, exec } from "child_process";
import { promisify } from "util";
import {
  downloadJar,
  ensureServerJar,
  findForgeArgsFile,
  isMinecraftType,
  isValidJarFile,
  jarFileNameFor,
  normalizeType,
} from "./jarDownloader.js";
import { panelEvents } from "../events.js";
import { readJSON, writeJSON } from "./db.js";

const execAsync = promisify(exec);

/**
 * Local process runtime.
 *
 * This is the real Minecraft (and Node/Python) process manager. It keeps the
 * lifecycle state for every locally hosted server, streams stdout/stderr,
 * persists console history, and exposes accurate status reporting.
 */

export type ServerLifecycleStatus =
  | "offline"
  | "downloading"
  | "starting"
  | "online"
  | "stopping"
  | "error";

interface LocalRuntimeState {
  process: ChildProcess | null;
  status: ServerLifecycleStatus;
  startedAt: string | null;
  readyAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
  exitCode: number | null;
  stopping: boolean;
  logs: string[];
  logStream: fs.WriteStream | null;
  forgeArgsFile: string | null;
  genericReadyTimer: NodeJS.Timeout | null;
  runtimeKind: "minecraft" | "node" | "python";
}

const MAX_BUFFER_LINES = 2000;

const states = new Map<string, LocalRuntimeState>();

const createState = (): LocalRuntimeState => ({
  process: null,
  status: "offline",
  startedAt: null,
  readyAt: null,
  stoppedAt: null,
  lastError: null,
  exitCode: null,
  stopping: false,
  logs: [],
  logStream: null,
  forgeArgsFile: null,
  genericReadyTimer: null,
  runtimeKind: "minecraft",
});

const getState = (id: string): LocalRuntimeState => {
  let state = states.get(id);
  if (!state) {
    state = createState();
    states.set(id, state);
  }
  return state;
};

const serverDirFor = (id: string) => path.join(process.cwd(), ".data", "servers", id);

const emitStatus = (id: string) => {
  const state = getState(id);
  const payload = {
    id,
    status: state.status,
    running: state.status === "starting" || state.status === "online" || state.status === "stopping",
    startedAt: state.startedAt,
    readyAt: state.readyAt,
    stoppedAt: state.stoppedAt,
    error: state.lastError,
    exitCode: state.exitCode,
  };
  panelEvents.emit("status", id, payload);
};

const persistServerRecord = async (
  id: string,
  status: ServerLifecycleStatus,
  extra?: { startedAt?: string | null; readyAt?: string | null; error?: string | null }
) => {
  try {
    const servers = (await readJSON("servers.json")) || [];
    const server = servers.find((s: any) => s.id === id);
    if (server) {
      server.status = status;
      if (extra?.startedAt !== undefined) server.startedAt = extra.startedAt;
      if (extra?.readyAt !== undefined) server.readyAt = extra.readyAt;
      if (extra?.error !== undefined) server.lastError = extra.error;
      await writeJSON("servers.json", servers);
    }
  } catch {
    /* ignore */
  }
};

const setStatus = (id: string, status: ServerLifecycleStatus, extra?: { error?: string | null }) => {
  const state = getState(id);
  state.status = status;
  if (extra && extra.error !== undefined) state.lastError = extra.error;
  if (status === "offline" || status === "error") {
    state.stoppedAt = new Date().toISOString();
    state.readyAt = null;
  }
  emitStatus(id);
  persistServerRecord(id, status, {
    startedAt: state.startedAt,
    readyAt: state.readyAt,
    error: state.lastError,
  }).catch(() => {});
};

/** Strip terminal colour codes before persisting/displaying logs. */
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const stripAnsi = (value: string) => value.replace(ANSI_RE, "");

const appendLog = (id: string, text: string) => {
  if (!text) return;
  const clean = stripAnsi(text);
  const state = getState(id);

  const lines = clean.split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    state.logs.push(line);
  }
  if (state.logs.length > MAX_BUFFER_LINES) {
    state.logs.splice(0, state.logs.length - MAX_BUFFER_LINES);
  }

  if (state.logStream?.writable) {
    state.logStream.write(clean.endsWith("\n") ? clean : `${clean}\n`);
  }

  panelEvents.emit("log", id, clean);
};

const panelLog = (id: string, message: string) => {
  appendLog(id, `[Panel] ${message}`);
};

const closeLogStream = (id: string) => {
  const state = getState(id);
  if (state.logStream) {
    try {
      state.logStream.end();
    } catch {
      /* ignore */
    }
    state.logStream = null;
  }
};

/* ------------------------------------------------------------------ */
/*  Java discovery                                                     */
/* ------------------------------------------------------------------ */

export const resolveJavaBinary = async (): Promise<string> => {
  if (process.env.JAVA_BIN && (await fs.pathExists(process.env.JAVA_BIN))) {
    return process.env.JAVA_BIN;
  }

  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [
        "java",
        "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
        "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe",
        "C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\java.exe",
      ]
    : [
        "java",
        "/usr/bin/java",
        "/usr/local/bin/java",
        "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
        "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
        "/usr/lib/jvm/java-11-openjdk-amd64/bin/java",
        "/usr/lib/jvm/default-java/bin/java",
        "/opt/java/openjdk/bin/java",
      ];

  for (const candidate of candidates) {
    if (candidate === "java") {
      try {
        await execAsync(isWin ? "where java" : "which java");
        return "java";
      } catch {
        /* try next */
      }
    } else if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }
  return process.env.JAVA_BIN || "java";
};

/* ------------------------------------------------------------------ */
/*  Server creation (files only - no JAR download here)                */
/* ------------------------------------------------------------------ */

export const createLocalServer = async (serverData: any) => {
  const serverPath = serverDirFor(serverData.id);
  await fs.ensureDir(serverPath);

  const type = normalizeType(serverData.type);
  const port = serverData.port || 25565;

  if (type === "nodejs" || type === "node") {
    const indexPath = path.join(serverPath, "index.js");
    const pkgPath = path.join(serverPath, "package.json");
    if (!(await fs.pathExists(indexPath))) {
      await fs.writeFile(
        indexPath,
        `// Node.js Application on zPanel\nconst http = require('http');\nconst port = process.env.PORT || process.env.SERVER_PORT || ${port};\n\nconsole.log('==============================================');\nconsole.log('🚀 Node.js Application Running on port ' + port);\nconsole.log('Node Version: ' + process.version);\nconsole.log('Upload your files in File Manager to customize!');\nconsole.log('==============================================');\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'online', runtime: 'node.js', time: new Date().toISOString() }));\n});\n\nserver.listen(port, '0.0.0.0', () => {\n  console.log(\`[Server] Listening on http://0.0.0.0:\${port}\`);\n});\n`
      );
    }
    if (!(await fs.pathExists(pkgPath))) {
      await fs.writeFile(
        pkgPath,
        JSON.stringify(
          {
            name: (serverData.name || "node-app").toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
            version: "1.0.0",
            description: "Node.js application hosted on zPanel",
            main: "index.js",
            scripts: { start: "node index.js" },
          },
          null,
          2
        )
      );
    }
    return `local-${serverData.id}`;
  }

  if (type === "python" || type === "python3") {
    const mainPath = path.join(serverPath, "main.py");
    const reqPath = path.join(serverPath, "requirements.txt");
    if (!(await fs.pathExists(mainPath))) {
      await fs.writeFile(
        mainPath,
        `# Python Application on zPanel\nimport os\nimport sys\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nport = int(os.environ.get("SERVER_PORT", os.environ.get("PORT", ${serverData.port || 8000})))\nprint("==============================================", flush=True)\nprint("🐍 Python Application Running", flush=True)\nprint(f"Python Version: {sys.version}", flush=True)\nprint(f"Listening Port: {port}", flush=True)\nprint("Upload your files in File Manager to customize!", flush=True)\nprint("==============================================", flush=True)\n\nclass RequestHandler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-type', 'application/json')\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "runtime": "python"}')\n\n    def log_message(self, format, *args):\n        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)\n\nserver = HTTPServer(('0.0.0.0', port), RequestHandler)\nprint(f"[Server] Listening on http://0.0.0.0:{port}", flush=True)\ntry:\n    server.serve_forever()\nexcept KeyboardInterrupt:\n    print("\\nStopping server...", flush=True)\n    server.server_close()\n`
      );
    }
    if (!(await fs.pathExists(reqPath))) {
      await fs.writeFile(reqPath, "# Add python dependencies here\n");
    }
    return `local-${serverData.id}`;
  }

  if (type === "velocity") {
    const configPath = path.join(serverPath, "velocity.toml");
    if (!(await fs.pathExists(configPath))) {
      await fs.writeFile(configPath, `bind = "0.0.0.0:${serverData.port || 25577}"\nmotd = "&#09add3A Velocity Server"\n`);
    }
  } else if (type === "bungeecord" || type === "waterfall") {
    const configPath = path.join(serverPath, "config.yml");
    if (!(await fs.pathExists(configPath))) {
      await fs.writeFile(
        configPath,
        `listeners:\n- query_port: ${serverData.port || 25577}\n  host: 0.0.0.0:${serverData.port || 25577}\n  max_players: 1000\n`
      );
    }
  } else {
    // Standard Minecraft server
    await fs.writeFile(path.join(serverPath, "eula.txt"), "eula=true\n");
    const propsPath = path.join(serverPath, "server.properties");
    if (!(await fs.pathExists(propsPath))) {
      await fs.writeFile(propsPath, `server-port=${port}\n`);
    }
  }

  return `local-${serverData.id}`;
};

/* ------------------------------------------------------------------ */
/*  JAR management                                                     */
/* ------------------------------------------------------------------ */

const ensureForgeInstalled = async (id: string, serverData: any, serverDir: string) => {
  const existing = await findForgeArgsFile(serverDir);
  if (existing) return existing;
  const javaBin = await resolveJavaBinary();
  panelLog(id, `Forge launch files not found. Running the official installer for ${serverData.version || "latest"}…`);
  const result = await downloadJar("forge", serverData.version || "latest", path.join(serverDir, "server.jar"), (progress) => {
    if (progress.message) panelLog(id, progress.message);
  });
  if (result.path && (await fs.pathExists(result.path))) {
    const state = getState(id);
    state.forgeArgsFile = result.path;
    return result.path;
  }
  return null;
};

/**
 * Ensure the required server JAR exists and is a valid archive.
 * Downloads it automatically when missing/corrupt. Throws on failure so the
 * caller can never start a server without its JAR.
 */
export const ensureLocalServerJar = async (id: string, serverData: any): Promise<string | null> => {
  const type = normalizeType(serverData?.type);
  if (!isMinecraftType(type)) return null;

  try {
    setStatus(id, "downloading", { error: null });
    const jarPath = await ensureServerJar(serverData, (progress) => {
      if (progress.message) panelLog(id, progress.message);
    });
    return jarPath;
  } catch (err: any) {
    const message = `Server JAR check failed: ${err.message}`;
    panelLog(id, message);
    setStatus(id, "error", { error: message });
    throw new Error(message);
  }
};

/* ------------------------------------------------------------------ */
/*  Startup / shutdown                                                 */
/* ------------------------------------------------------------------ */

const splitCommand = (command: string): string[] => {
  const args: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) args.push(current);
  return args;
};

const READY_PATTERNS = [
  /Done \([0-9.,]+s\)! For help, type "help"/i,
  /Done \([0-9.,]+s\)/i,
  /Done in [0-9.,]+s/i,
  /Listening on \/?[0-9a-zA-Z.:]+:\d+/i,
  /\[Server\] Listening on/i,
  /Application Running/i,
  /Server started/i,
  /Dedicated server status: Successfully started/i,
  /For help, type "help"/i,
  /joined the game/i,
  /logged in with entity id/i,
  /UUID of player .* is/i,
  /Velocity is running/i,
  /Enabled BungeeCord/i,
];

const STARTUP_ERROR_PATTERNS = [
  /You need to agree to the EULA/i,
  /Failed to load eula\.txt/i,
  /Unable to access jarfile/i,
  /Could not find or load main class/i,
  /UnsupportedClassVersionError/i,
  /java\.lang\.OutOfMemoryError/i,
  /Address already in use/i,
  /Failed to bind to port/i,
  /Exception in thread "main"/i,
];

const looksReady = (line: string) => {
  const clean = stripAnsi(line);
  return READY_PATTERNS.some((re) => re.test(clean));
};

const looksLikeStartupError = (line: string) => {
  const clean = stripAnsi(line);
  return STARTUP_ERROR_PATTERNS.some((re) => re.test(clean));
};

const markOnline = (id: string) => {
  const state = getState(id);
  if (state.status === "online") return;
  state.readyAt = new Date().toISOString();
  state.lastError = null;
  if (state.genericReadyTimer) {
    clearTimeout(state.genericReadyTimer);
    state.genericReadyTimer = null;
  }
  setStatus(id, "online");
  panelLog(id, "Server is now online and ready to accept connections.");
};

const handleOutputLine = (id: string, rawLine: string) => {
  const state = getState(id);
  const clean = stripAnsi(rawLine).trim();
  if (!clean) return;

  if (looksReady(clean) && (state.status === "starting" || state.status === "downloading")) {
    markOnline(id);
  }

  if (looksLikeStartupError(clean)) {
    state.lastError = clean;
    if (state.status === "starting" || state.status === "downloading") {
      setStatus(id, "error", { error: state.lastError });
    }
  }
};

export const startLocalServer = async (id: string, serverData: any) => {
  const state = getState(id);

  if (state.process && !state.process.killed) {
    panelLog(id, "Start requested, but a server process is already running.");
    return { status: state.status, startedAt: state.startedAt };
  }

  const serverPath = serverDirFor(id);
  await fs.ensureDir(serverPath);

  const type = normalizeType(serverData.type);
  state.lastError = null;
  state.exitCode = null;
  state.stopping = false;
  state.readyAt = null;
  state.stoppedAt = null;
  state.runtimeKind =
    type === "nodejs" || type === "node" ? "node" : type === "python" || type === "python3" ? "python" : "minecraft";

  setStatus(id, "starting");

  // Open the persistent panel console log (append so history survives restarts).
  closeLogStream(id);
  state.logStream = fs.createWriteStream(path.join(serverPath, "console.log"), { flags: "a" });

  panelLog(id, `Starting ${serverData.name || id} (${type} ${serverData.version || "latest"})…`);

  let child: ChildProcess;

  try {
    if (type === "nodejs" || type === "node") {
      let entry = "index.js";
      for (const testFile of ["index.js", "app.js", "server.js", "main.js", "bot.js"]) {
        if (await fs.pathExists(path.join(serverPath, testFile))) {
          entry = testFile;
          break;
        }
      }
      child = spawn(process.platform === "win32" ? "node.exe" : "node", [entry], {
        cwd: serverPath,
        env: {
          ...process.env,
          PORT: String(serverData.port || 3000),
          SERVER_PORT: String(serverData.port || 3000),
          NODE_ENV: "production",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else if (type === "python" || type === "python3") {
      let entry = "main.py";
      for (const testFile of ["main.py", "app.py", "bot.py", "index.py", "server.py"]) {
        if (await fs.pathExists(path.join(serverPath, testFile))) {
          entry = testFile;
          break;
        }
      }
      child = spawn(process.platform === "win32" ? "python" : "python3", ["-u", entry], {
        cwd: serverPath,
        env: {
          ...process.env,
          PORT: String(serverData.port || 8000),
          SERVER_PORT: String(serverData.port || 8000),
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      // Ensure the EULA is accepted for Minecraft servers.
      await fs.writeFile(path.join(serverPath, "eula.txt"), "eula=true\n");

      const javaBin = await resolveJavaBinary();
      const memoryValue = Number(serverData.ram);
      const memory = Number.isFinite(memoryValue) && memoryValue > 0 ? memoryValue : 1;

      let jarPath: string | null = null;
      try {
        jarPath = await ensureLocalServerJar(id, serverData);
      } catch (err: any) {
        closeLogStream(id);
        setStatus(id, "error", { error: err.message });
        throw err;
      }

      // The JAR download may have changed the status; the process has not
      // started yet, so go back to "starting".
      setStatus(id, "starting");

      if (serverData.startupCommand && String(serverData.startupCommand).trim()) {
        const parts = splitCommand(String(serverData.startupCommand).trim());
        const bin = parts[0];
        const args = parts.slice(1);
        panelLog(id, `Using custom startup command: ${parts[0]} …`);
        child = spawn(bin, args, {
          cwd: serverPath,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } else if (state.forgeArgsFile || (type === "forge" || type === "neoforge" || type === "quilt")) {
        const argsFile = state.forgeArgsFile || (await findForgeArgsFile(serverPath));
        if (!argsFile) {
          throw new Error("Forge launch arguments are missing. Reinstall Forge or upload a server JAR.");
        }
        state.forgeArgsFile = argsFile;
        panelLog(id, `Launching Forge with ${path.basename(argsFile)}…`);
        child = spawn(
          javaBin,
          [
            `-Xms${memory}G`,
            `-Xmx${memory}G`,
            "-Dterminal.jline=false",
            "-Dterminal.ansi=false",
            `@${argsFile}`,
            "nogui",
          ],
          { cwd: serverPath, stdio: ["pipe", "pipe", "pipe"] }
        );
      } else {
        const jarName = jarPath ? path.basename(jarPath) : jarFileNameFor(serverData);
        child = spawn(
          javaBin,
          [
            `-Xms${memory}G`,
            `-Xmx${memory}G`,
            "-Dterminal.jline=false",
            "-Dterminal.ansi=false",
            "-jar",
            jarName,
            "nogui",
          ],
          { cwd: serverPath, stdio: ["pipe", "pipe", "pipe"] }
        );
      }
    }
  } catch (err: any) {
    const message = `Failed to start server process: ${err.message}`;
    panelLog(id, message);
    setStatus(id, "error", { error: message });
    closeLogStream(id);
    throw err;
  }

  state.process = child;

  // `spawn` and `error` are emitted asynchronously. Wait for the process to
  // actually launch (or fail) before reporting success to the caller, so a
  // missing Java binary / JAR is surfaced as a start error instead of a
  // phantom "started" server.
  const spawnResult = new Promise<void>((resolve, reject) => {
    child.once("spawn", () => resolve());
    child.once("error", (err: Error) => reject(err));
  });

  let portCheckInterval: NodeJS.Timeout | null = null;
  const targetPort = Number(serverData.port) || 25565;

  const clearTimers = () => {
    if (portCheckInterval) {
      clearInterval(portCheckInterval);
      portCheckInterval = null;
    }
    if (state.genericReadyTimer) {
      clearTimeout(state.genericReadyTimer);
      state.genericReadyTimer = null;
    }
  };

  child.on("spawn", () => {
    state.startedAt = new Date().toISOString();
    panelLog(id, `Server process started (PID ${child.pid}) for ${serverData.name || id} (${type}).`);
    emitStatus(id);

    if (type === "nodejs" || type === "node" || type === "python" || type === "python3") {
      state.genericReadyTimer = setTimeout(() => {
        if (state.status === "starting") {
          markOnline(id);
        }
      }, 4000);
    } else {
      // Secondary readiness check: if the game server binds its port, transition to online
      portCheckInterval = setInterval(() => {
        if (state.status === "online") {
          clearTimers();
          return;
        }
        if (state.status !== "starting") {
          clearTimers();
          return;
        }
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on("connect", () => {
          socket.destroy();
          if (state.status === "starting") {
            markOnline(id);
          }
          clearTimers();
        });
        socket.on("error", () => socket.destroy());
        socket.on("timeout", () => socket.destroy());
        socket.connect(targetPort, "127.0.0.1");
      }, 2500);
    }
  });

  child.on("error", (err: Error) => {
    clearTimers();
    state.lastError = err.message;
    panelLog(id, `Failed to start server process: ${err.message}`);
    if (err.message.includes("ENOENT")) {
      panelLog(id, "---- RUNTIME NOTICE ----");
      panelLog(id, `Required executable or binary is missing or not in PATH for runtime (${type}).`);
      panelLog(id, "For Minecraft servers install a compatible Java runtime, e.g.:");
      panelLog(id, "  sudo apt update && sudo apt install -y openjdk-21-jre-headless");
      panelLog(id, "------------------------");
    }
    state.process = null;
    state.startedAt = null;
    closeLogStream(id);
    setStatus(id, "error", { error: err.message });
  });

  let stdoutRemainder = "";
  let stderrRemainder = "";

  const processChunk = (chunk: Buffer, isStderr: boolean) => {
    const raw = (isStderr ? stderrRemainder : stdoutRemainder) + chunk.toString("utf8");
    const lines = raw.split(/\r?\n/);
    if (raw.endsWith("\n") || raw.endsWith("\r")) {
      if (isStderr) stderrRemainder = "";
      else stdoutRemainder = "";
    } else {
      const remainder = lines.pop() ?? "";
      if (isStderr) stderrRemainder = remainder;
      else stdoutRemainder = remainder;
    }

    if (lines.length > 0) {
      const fullText = lines.join("\n") + "\n";
      appendLog(id, fullText);
      for (const line of lines) {
        handleOutputLine(id, line);
      }
    }
  };

  child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
    clearTimers();
    if (stdoutRemainder.trim()) {
      appendLog(id, stdoutRemainder + "\n");
      handleOutputLine(id, stdoutRemainder);
      stdoutRemainder = "";
    }
    if (stderrRemainder.trim()) {
      appendLog(id, stderrRemainder + "\n");
      handleOutputLine(id, stderrRemainder);
      stderrRemainder = "";
    }

    const wasStopping = state.stopping;
    state.process = null;
    state.exitCode = code;
    panelLog(
      id,
      `Server process exited with code ${code}${signal ? ` (signal ${signal})` : ""}.`
    );
    closeLogStream(id);
    state.startedAt = null;
    state.readyAt = null;

    if (wasStopping) {
      setStatus(id, "offline", { error: null });
    } else if (code === 0 && state.status === "online") {
      // Clean shutdown triggered from inside the game (e.g. /stop).
      setStatus(id, "offline", { error: null });
    } else if (state.status === "error") {
      emitStatus(id);
    } else {
      setStatus(id, "error", {
        error: state.lastError || `Server process exited unexpectedly with code ${code}.`,
      });
    }
    state.stopping = false;
  });

  child.stdout?.on("data", (chunk: Buffer) => processChunk(chunk, false));
  child.stderr?.on("data", (chunk: Buffer) => processChunk(chunk, true));

  try {
    await spawnResult;
  } catch (err: any) {
    closeLogStream(id);
    setStatus(id, "error", { error: err.message || "Failed to start server process" });
    throw err;
  }

  return { status: state.status, startedAt: state.startedAt };
};

const waitForExit = (child: ChildProcess, timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    if (child.exitCode !== null || child.killed) return resolve(true);
    let done = false;
    const finish = (exited: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(exited);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("close", () => finish(true));
    child.once("exit", () => finish(true));
    child.once("error", () => finish(true));
  });

export const stopLocalServer = async (id: string) => {
  const state = getState(id);
  const child = state.process;

  if (!child || child.exitCode !== null) {
    state.process = null;
    state.startedAt = null;
    state.readyAt = null;
    closeLogStream(id);
    setStatus(id, "offline", { error: null });
    return;
  }

  state.stopping = true;
  setStatus(id, "stopping");
  panelLog(id, "Stopping server…");

  const isGeneric = state.runtimeKind !== "minecraft";

  try {
    if (!isGeneric && child.stdin?.writable) {
      child.stdin.write("stop\n");
    }
  } catch {
    /* fall back to signals below */
  }

  const graceful = await waitForExit(child, isGeneric ? 5000 : 30000);
  if (!graceful) {
    panelLog(id, "Server did not stop in time; terminating the process.");
    try {
      if (process.platform === "win32" && child.pid) {
        await execAsync(`taskkill /PID ${child.pid} /T /F`).catch(() => {});
      } else {
        child.kill("SIGTERM");
        await waitForExit(child, 5000);
        if (state.process) child.kill("SIGKILL");
      }
    } catch {
      /* ignore */
    }
    await waitForExit(child, 3000);
  }

  state.process = null;
  state.stopping = false;
  state.startedAt = null;
  state.readyAt = null;
  closeLogStream(id);
  setStatus(id, "offline", { error: null });
  panelLog(id, "Server stopped.");
};

export const restartLocalServer = async (id: string, serverData: any) => {
  await stopLocalServer(id);
  // Wait a moment for ports/files to be released before spawning again.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return startLocalServer(id, serverData);
};

export const deleteLocalServer = async (id: string) => {
  const state = getState(id);
  if (state.process) {
    await stopLocalServer(id);
  }
  closeLogStream(id);
  states.delete(id);
  const serverPath = serverDirFor(id);
  await fs.remove(serverPath);
};

/* ------------------------------------------------------------------ */
/*  Status / logs / commands                                           */
/* ------------------------------------------------------------------ */

export const getLocalServerStatus = async (id: string) => {
  const state = states.get(id);
  if (!state) {
    return {
      State: {
        Running: false,
        Status: "offline" as ServerLifecycleStatus,
        StartedAt: null,
        ReadyAt: null,
        ExitCode: null,
        Error: null,
      },
    };
  }

  const running = !!state.process && state.process.exitCode === null;
  return {
    State: {
      Running: running,
      Status: running ? state.status : state.status === "error" ? "error" : "offline",
      StartedAt: state.startedAt,
      ReadyAt: state.readyAt,
      ExitCode: state.exitCode,
      Error: state.lastError,
    },
  };
};

export const getLocalServerLifecycleStatus = (id: string): ServerLifecycleStatus => {
  const state = states.get(id);
  if (!state) return "offline";
  const running = !!state.process && state.process.exitCode === null;
  if (!running && state.status !== "error") return "offline";
  return state.status;
};

export const getLocalServerStats = async (id: string) => {
  const child = states.get(id)?.process;
  if (!child || !child.pid) return null;

  if (process.platform !== "win32") {
    try {
      const { stdout } = await execAsync(`ps -p ${child.pid} -o %cpu,rss`);
      const lines = stdout.trim().split("\n");
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        const cpu = parseFloat(parts[0]);
        const rss = parseInt(parts[1]) * 1024;
        return {
          cpu_stats: { cpu_usage: { total_usage: cpu }, system_cpu_usage: 100 },
          precpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 100 },
          memory_stats: { usage: rss, limit: 1024 * 1024 * 1024 * 4 },
        };
      }
    } catch {
      /* ignore */
    }
  }

  return {
    cpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 100 },
    precpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 100 },
    memory_stats: { usage: 0, limit: 1024 * 1024 * 1024 },
  };
};

const readTail = async (filePath: string, lines: number): Promise<string> => {
  try {
    if (!(await fs.pathExists(filePath))) return "";
    const content = await fs.readFile(filePath, "utf8");
    if (!content.trim()) return "";
    return content.split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
};

/**
 * Historical logs. Prefer Minecraft's own `logs/latest.log` (real server log
 * with plugins/players/shutdown messages), then the panel console log, then
 * the legacy `panel.log`.
 */
export const getLocalServerLogs = async (id: string, lines = 200) => {
  const serverPath = serverDirFor(id);
  const state = states.get(id);

  // While running, the in-memory buffer is the most current (and includes
  // output from the current session even if the log file is buffered).
  if (state && state.logs.length > 0) {
    const fromBuffer = state.logs.slice(-lines).join("\n");
    if (fromBuffer.trim()) return fromBuffer;
  }

  const mcLog = await readTail(path.join(serverPath, "logs", "latest.log"), lines);
  if (mcLog.trim()) return mcLog;

  const consoleLog = await readTail(path.join(serverPath, "console.log"), lines);
  if (consoleLog.trim()) return consoleLog;

  return await readTail(path.join(serverPath, "panel.log"), lines);
};

export const attachLocalServerSocket = (_id: string, _serverId: string) => {
  // Local output is broadcast by the process manager through panelEvents, so
  // there is no per-socket stream to attach.
};

export const sendLocalServerCommand = async (id: string, command: string) => {
  const state = states.get(id);
  const child = state?.process;
  if (!child || child.killed || child.exitCode !== null || !child.stdin?.writable) {
    throw new Error("Server is not running. Start the server before sending commands.");
  }
  child.stdin.write(`${command}\n`);
};

export const getLocalProcessInfo = (id: string) => {
  const state = states.get(id);
  const child = state?.process;
  const serverPath = serverDirFor(id);
  if (child && child.exitCode === null) {
    return {
      pid: child.pid,
      jarPath: path.join(serverPath, "server.jar"),
      logPath: path.join(serverPath, "logs", "latest.log"),
      status: state?.status || "offline",
    };
  }
  return null;
};

/** Clear in-memory console buffer (used after server deletion / manual clear). */
export const clearLocalServerRuntime = (id: string) => {
  const state = states.get(id);
  if (!state) return;
  state.logs = [];
  state.forgeArgsFile = null;
  if (!state.process) states.delete(id);
};
