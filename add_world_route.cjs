const fs = require('fs');
let code = fs.readFileSync('src/server/routes/servers.ts', 'utf8');
code = code.replace(
  'router.post("/:id/files/unzip", unzipFile);',
  'router.post("/:id/files/unzip", unzipFile);\nrouter.post("/:id/world/import", require("../controllers/servers.js").importWorld);\nrouter.get("/:id/world/info", require("../controllers/servers.js").getWorldInfo);'
);
fs.writeFileSync('src/server/routes/servers.ts', code);
