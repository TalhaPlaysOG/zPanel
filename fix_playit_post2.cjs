const fs = require('fs');
let content = fs.readFileSync('src/server/routes/servers.ts', 'utf8');

content = content.replace(
/router\.post\("\/:id\/playit\/start"[\s\S]*?if \(server && server\.runtimeType === "local"\) \{\s*return res\.json\(\{ status: "stopped", claimLink: null, logs: "Playit integration is Beta\/Coming Soon for Local Process runtime\." \}\);\s*\}/,
\`router.post("/:id/playit/start", async (req, res) => { 
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  if (server && server.runtimeType === "local") {
    return res.status(400).json({ error: "Playit integration is Beta/Coming Soon for Local Process runtime." });
  }\`
);

content = content.replace(
/router\.post\("\/:id\/playit\/stop"[\s\S]*?if \(server && server\.runtimeType === "local"\) \{\s*return res\.json\(\{ status: "stopped", claimLink: null, logs: "Playit integration is Beta\/Coming Soon for Local Process runtime\." \}\);\s*\}/,
\`router.post("/:id/playit/stop", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  if (server && server.runtimeType === "local") {
    return res.status(400).json({ error: "Playit integration is Beta/Coming Soon for Local Process runtime." });
  }\`
);

content = content.replace(
/router\.post\("\/:id\/playit\/reset"[\s\S]*?if \(server && server\.runtimeType === "local"\) \{\s*return res\.json\(\{ status: "stopped", claimLink: null, logs: "Playit integration is Beta\/Coming Soon for Local Process runtime\." \}\);\s*\}/,
\`router.post("/:id/playit/reset", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  if (server && server.runtimeType === "local") {
    return res.status(400).json({ error: "Playit integration is Beta/Coming Soon for Local Process runtime." });
  }\`
);

fs.writeFileSync('src/server/routes/servers.ts', content);
