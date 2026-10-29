const fs = require('fs');
let code = fs.readFileSync('src/server/routes/servers.ts', 'utf8');

if (!code.includes('import { importWorld, getWorldInfo }')) {
  code = code.replace(
    'import {',
    'import { importWorld, getWorldInfo } from "../controllers/world.js";\nimport {'
  );
}

code = code.replace(
  'require("../controllers/world.js").importWorld',
  'importWorld'
);

code = code.replace(
  'require("../controllers/world.js").getWorldInfo',
  'getWorldInfo'
);

fs.writeFileSync('src/server/routes/servers.ts', code);
