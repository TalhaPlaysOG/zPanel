const fs = require('fs');
let content = fs.readFileSync('src/server/routes/servers.ts', 'utf8');

// Block /api/servers/:id/playit* for local servers
const checkLocal = `
  const server = servers.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.runtimeType === "local") {
    return res.status(400).json({ error: "Playit integration is Beta/Coming Soon for Local Process runtime.", status: "stopped", logs: "" });
  }
`;

content = content.replace(
/  const server = servers\.find\(\(s: any\) => s\.id === id\);\n  const serverName = server \? server\.name\.replace\(\/\[\^a-zA-Z0-9_-\]\/g, "_"\) : id;/g,
`  const server = servers.find((s: any) => s.id === id);
  if (server && server.runtimeType === "local") {
    return res.json({ status: "stopped", claimLink: null, logs: "Playit integration is Beta/Coming Soon for Local Process runtime." });
  }
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;`
);

content = content.replace(
/  const server = servers\.find\(\(s: any\) => s\.id === id\);\n  const serverName = server \? server\.name\.replace\(\/\[\^a-zA-Z0-9_-\]\/g, "_"\) : id;/g,
`  const server = servers.find((s: any) => s.id === id);
  if (server && server.runtimeType === "local") {
    return res.status(400).json({ error: "Playit integration is Beta/Coming Soon for Local Process runtime." });
  }
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;`
);

fs.writeFileSync('src/server/routes/servers.ts', content);
