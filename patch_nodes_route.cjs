const fs = require('fs');
let content = fs.readFileSync('src/server/routes/nodes.ts', 'utf8');

// Update node creation to handle connectionMode and nullable port
content = content.replace(
  /const \{ name, ip, port, key \} = req\.body;/g,
  `const { name, ip, port, key, connectionMode } = req.body;`
);

content = content.replace(
  /const newNode = \{\n    id: crypto\.randomBytes\(8\)\.toString\("hex"\),\n    name,\n    ip,\n    port: port \? Number\(port\) : 6768,\n    key,\n    isLocal: false,\n    status: "connecting",\n    createdAt: new Date\(\)\.toISOString\(\)\n  \};/g,
  `const newNode = {
    id: crypto.randomBytes(8).toString("hex"),
    name,
    ip,
    port: connectionMode === "tunnel" ? null : (port ? Number(port) : 6768),
    key,
    connectionMode: connectionMode || "direct",
    isLocal: false,
    status: "connecting",
    createdAt: new Date().toISOString()
  };`
);

fs.writeFileSync('src/server/routes/nodes.ts', content);
