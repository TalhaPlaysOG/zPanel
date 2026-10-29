const fs = require('fs-extra');
const path = require('path');

async function patchWorld() {
  const file = "src/server/controllers/world.ts";
  let content = await fs.readFile(file, 'utf8');

  const new_analyze_logic = `
export const analyzeWorld = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { zipPath } = req.body;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);

  try {
    const zipFullPath = path.join(serverDir, zipPath);
    if (!fs.existsSync(zipFullPath)) {
      return res.status(400).json({ error: "Zip file not found" });
    }

    const tempExtractDir = path.join(serverDir, \`temp_analyze_\${Date.now()}\`);
    await extract(zipFullPath, { dir: tempExtractDir });

    let foundLevelDat = null;
    let worldDataVersion = 0;
    
    // Recursive search for level.dat
    const searchLevelDat = async (dir: string) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const res = await searchLevelDat(fullPath);
          if (res) return res;
        } else if (file === 'level.dat') {
          return fullPath;
        }
      }
      return null;
    };

    foundLevelDat = await searchLevelDat(tempExtractDir);

    if (foundLevelDat) {
      const buffer = await fs.readFile(foundLevelDat);
      const { parsed } = await parseNbt(buffer) as any;
      if (parsed?.value?.Data?.value?.DataVersion) {
        worldDataVersion = parsed.value.Data.value.DataVersion.value;
      }
    }

    await fs.remove(tempExtractDir);

    if (!foundLevelDat) {
       return res.json({ status: "invalid", message: "Invalid archive: level.dat not found." });
    }
    
    // Basic heuristics for DataVersion:
    // 3465 = 1.20.1, ~3953 = 1.21.x
    // Return the data version and let client or server compare.
    // For now we just return it.
    res.json({ status: "valid", worldDataVersion, foundLevelDat });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
};
`;

  content = content + "\n" + new_analyze_logic;
  await fs.writeFile(file, content);
}

patchWorld();
