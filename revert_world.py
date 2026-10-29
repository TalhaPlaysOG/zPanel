import re

with open("src/server/controllers/world.ts", "r") as f:
    content = f.read()

# Revert archiver logic in importWorld
old_backup_logic = """
    // 3. Create backup of current world if it exists
    const currentWorldPath = path.join(serverDir, levelName);
    if (fs.existsSync(currentWorldPath)) {
      const backupDir = path.join(process.cwd(), ".data", "backups", id);
      await fs.ensureDir(backupDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `${levelName}_backup_${timestamp}`);
      await fs.move(currentWorldPath, backupPath);
    }
"""
content = re.sub(r'    // 3\. Create backup of current world if it exists.*?\n    \}\n', old_backup_logic, content, flags=re.DOTALL)

# Revert permissions logic
old_permissions_logic = """
    // 6. Fix ownership/permissions based on existing files
    if (isLocal) {
      if (process.getuid) {
         try {
             // simplified version
         } catch(e) {}
      }
    }
    res.json({ success: true, message: "World imported successfully!" });
"""
content = re.sub(r'    // 6\. Fix ownership/permissions based on existing files.*?\n    res\.json\(\{ success: true, message: "World imported successfully!", permissions: permissionResults \}\);\n', old_permissions_logic, content, flags=re.DOTALL)

# Remove analyzeWorld
content = re.sub(r'export const analyzeWorld = async \(req: Request, res: Response\) => \{.*?\n\};\n', '', content, flags=re.DOTALL)

with open("src/server/controllers/world.ts", "w") as f:
    f.write(content)
