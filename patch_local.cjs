const fs = require('fs');
let content = fs.readFileSync('src/server/services/local.ts', 'utf8');

// Replace startLocalServer with a robust version
content = content.replace(/export const startLocalServer = async \([^]*?export const stopLocalServer/m, `
export const startLocalServer = async (id: string, serverData: any) => {
  const serverPath = path.join(process.cwd(), ".data", "servers", id);
  const jarPath = path.join(serverPath, "server.jar");

  if (!await fs.pathExists(jarPath)) {
    throw new Error("server.jar not found");
  }

  const memory = serverData.ram || 1;
  const child = spawn("java", [\`-Xms\${memory}G\`, \`-Xmx\${memory}G\`, "-jar", "server.jar", "nogui"], {
    cwd: serverPath,
    stdio: ["pipe", "pipe", "pipe"]
  });

  const logPath = path.join(serverPath, "panel.log");
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  processes.set(id, child);

  const emitLog = (msg: string) => {
    panelEvents.emit("log", id, msg);
  };

  const logMessage = (msg: string) => {
    const formatted = \`[Panel] \${msg}\\n\`;
    if (logStream.writable) {
      logStream.write(formatted);
    }
    emitLog(formatted);
  };

  child.on("spawn", () => {
    logMessage(\`Server process started with PID \${child.pid}\`);
  });

  child.on("error", (err) => {
    logMessage(\`Failed to start server process: \${err.message}\`);
    if (err.message.includes("ENOENT")) {
        logMessage("Java is not installed or not in PATH! Please install Java.");
    }
  });

  child.on("close", (code) => {
    logMessage(\`Server process exited with code \${code}\`);
    processes.delete(id);
    activeStreams.delete(id);
  });

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
    emitLog(text);
  });

  child.stderr?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
    emitLog(text);
  });
};

export const stopLocalServer`);

// Make attachLocalServerSocket a no-op since startLocalServer handles it now
content = content.replace(/export const attachLocalServerSocket = \([^]*?export const sendLocalServerCommand/m, `
export const attachLocalServerSocket = (id: string, serverId: string) => {
  // handled natively by startLocalServer now to capture all output reliably
};

export const sendLocalServerCommand`);

fs.writeFileSync('src/server/services/local.ts', content);
