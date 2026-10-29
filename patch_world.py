import re

with open("src/server/controllers/world.ts", "r") as f:
    content = f.read()

# I want to add archiver to create full backups easily in world.ts
new_backup_logic = """
    // 3. Create backup of current world if it exists
    const backupDir = path.join(process.cwd(), ".data", "backups", id);
    await fs.ensureDir(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    // We create a full zip backup before importing
    const archiver = (await import("archiver")).default;
    const backupZipPath = path.join(backupDir, `pre_import_backup_${timestamp}.zip`);
    const output = fs.createWriteStream(backupZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(serverDir, false);
    await archive.finalize();
    
    // Then we clean the old world folders
    const currentWorldPath = path.join(serverDir, levelName);
    if (fs.existsSync(currentWorldPath)) {
       await fs.remove(currentWorldPath);
    }
"""

content = re.sub(r'    // 3\. Create backup of current world if it exists.*?\n    \}\n', new_backup_logic, content, flags=re.DOTALL)

with open("src/server/controllers/world.ts", "w") as f:
    f.write(content)
