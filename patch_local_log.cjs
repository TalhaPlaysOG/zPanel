const fs = require('fs');
let content = fs.readFileSync('src/server/services/local.ts', 'utf8');

content = content.replace(
  /const child = spawn\("java", \[`-Xms\$\{memory\}G`, `-Xmx\$\{memory\}G`, "-jar", "server.jar", "nogui"\], \{\n    cwd: serverPath,\n    stdio: \["pipe", "pipe", "pipe"\]\n  \}\);/g,
  `const child = spawn("java", [\`-Xms\${memory}G\`, \`-Xmx\${memory}G\`, "-jar", "server.jar", "nogui"], {
    cwd: serverPath,
    stdio: ["pipe", "pipe", "pipe"]
  });

  const logMessage = (msg: string) => {
    const formatted = \`[Panel] \${msg}\\n\`;
    if (logStream.writable) {
      logStream.write(formatted);
    }
    panelEvents.emit("log", id, formatted);
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
`
);

content = content.replace(/child\.on\("exit", \(\) => \{\n    processes\.delete\(id\);\n  \}\);/g, '');

fs.writeFileSync('src/server/services/local.ts', content);
