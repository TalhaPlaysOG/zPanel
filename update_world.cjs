const fs = require('fs');
let code = fs.readFileSync('src/server/controllers/world.ts', 'utf8');

const permFixCode = `
    // 5. Fix ownership/permissions
    const isLocal = !server.nodeId || server.nodeId === "local";
    if (isLocal) {
      if (process.getuid) {
        const uid = process.getuid();
        const gid = process.getgid ? process.getgid() : uid;
        
        // Recursive chown function
        const chownR = async (dir) => {
          const files = await fs.readdir(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            await fs.chown(fullPath, uid, gid);
            if (stat.isDirectory()) {
              await chownR(fullPath);
            }
          }
        };
        await fs.chown(currentWorldPath, uid, gid);
        await chownR(currentWorldPath);
      }
    } else {
      // Docker runtime
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);
      
      const serverType = server.type || "PAPER";
      const isProxy = ["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(serverType.toUpperCase());
      const image = isProxy ? "itzg/bungeecord:latest" : "itzg/minecraft-server:latest";
      
      try {
        // Run a temporary container to fix permissions using the container's default user
        // The itzg image uses 'minecraft' user which has a dynamic UID based on env, or default 1000.
        // We will execute a chown command using the image's entrypoint or sh.
        const cmd = \`docker run --rm --entrypoint /bin/sh -v "\${currentWorldPath}:/data/world" \${image} -c "chown -R \\$(id -u):\\$(id -g) /data/world"\`;
        await execAsync(cmd);
      } catch (err) {
        console.error("Failed to fix docker permissions:", err);
      }
    }
`;

code = code.replace(
  '    if (server.nodeId && server.nodeId !== "local") {\n      // It\'s docker. We can try to run a quick docker command to chown it.\n      // But let\'s just chmod 755 and 644\n    }',
  permFixCode
);

fs.writeFileSync('src/server/controllers/world.ts', code);
