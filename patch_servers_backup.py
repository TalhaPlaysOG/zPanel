import re

with open("src/server/controllers/servers.ts", "r") as f:
    content = f.read()

new_backup_logic = """
    if (await fs.pathExists(serverDir)) {
      const archiver = (await import("archiver")).default;
      const output = fs.createWriteStream(backupFile);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);
      archive.directory(serverDir, false);
      
      const serversJSON = await readJSON("servers.json");
      archive.append(JSON.stringify(serversJSON.find((s: any) => s.id === id), null, 2), { name: "server_config_snapshot.json" });
      
      await archive.finalize();
    }
"""

content = re.sub(r'    if \(await fs\.pathExists\(serverDir\)\) \{\n      // Create backup zip\n.*?\n    \}', new_backup_logic, content, flags=re.DOTALL)

with open("src/server/controllers/servers.ts", "w") as f:
    f.write(content)
