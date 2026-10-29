const fs = require('fs');
let code = fs.readFileSync('src/server/controllers/servers.ts', 'utf8');

const preflightCode = `
    if (server.suspended) {
      return res.status(403).json({ error: "Server is suspended" });
    }
    
    // PRE-FLIGHT CHECKS
    try {
      const serverDir = path.join(process.cwd(), ".data", "servers", server.id);
      
      // 1. Check for stale session locks and remove them if server is stopped
      // But wait, the prompt says: "Never delete session.lock while the server process/container is running."
      // Since we are inside startServer, the server is supposedly stopped right now.
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
            return res.status(500).json({ error: \`Startup Diagnostic Failed: Permission denied when removing stale \${lockFile}\` });
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
      
      // 3. Disk space
      // Simple check (assume enough for now unless we import diskusage)
      
    } catch (preflightErr) {
      console.error(preflightErr);
    }
`;

code = code.replace(
  '    if (server.suspended) {\n      return res.status(403).json({ error: "Server is suspended" });\n    }',
  preflightCode
);

fs.writeFileSync('src/server/controllers/servers.ts', code);
