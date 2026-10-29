const fs = require('fs');
let code = fs.readFileSync('src/server/routes/servers.ts', 'utf8');
code = code.replace(
  'require("../controllers/servers.js").importWorld',
  'require("../controllers/world.js").importWorld'
);
code = code.replace(
  'require("../controllers/servers.js").getWorldInfo',
  'require("../controllers/world.js").getWorldInfo'
);
fs.writeFileSync('src/server/routes/servers.ts', code);
