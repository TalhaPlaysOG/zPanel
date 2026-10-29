const fs = require('fs');
let content = fs.readFileSync('src/server/controllers/servers.ts', 'utf8');

const newFunc = `export const checkPort = async (req: Request, res: Response) => {
  const { port } = req.query;
  if (!port) return res.status(400).json({ error: "Port is required" });
  
  const servers = await readJSON("servers.json") || [];
  const inUse = servers.some((s: any) => s.port == port);
  
  res.json({ inUse });
};

export const createServer =`;

content = content.replace(/export const createServer =/g, newFunc);
fs.writeFileSync('src/server/controllers/servers.ts', content);
