import re

with open("src/server/controllers/servers.ts", "r") as f:
    content = f.read()

new_restore_logic = """
export const restoreBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  const backupPath = path.join(backupsDir, filename);

  try {
    if (!(await fs.pathExists(backupPath))) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const status = await getServerRuntimeStatus({ id } as any);
    if (status?.State?.Running) {
      return res.status(400).json({ error: "Please stop the server before restoring a backup." });
    }

    // Clean current directory except some critical things if needed, but for full restore, we empty it
    await fs.emptyDir(serverDir);

    const extract = (await import("extract-zip")).default;
    await extract(backupPath, { dir: serverDir });
    
    // Check if there was a server_config_snapshot.json and apply it
    const configSnapshot = path.join(serverDir, "server_config_snapshot.json");
    if (fs.existsSync(configSnapshot)) {
        const oldConfig = await readJSON(configSnapshot);
        const servers = await readJSON("servers.json");
        const idx = servers.findIndex((s: any) => s.id === id);
        if (idx !== -1) {
            servers[idx] = { ...servers[idx], ...oldConfig };
            await writeJSON("servers.json", servers);
        }
        await fs.remove(configSnapshot);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
"""

content = content + "\n" + new_restore_logic

with open("src/server/controllers/servers.ts", "w") as f:
    f.write(content)
