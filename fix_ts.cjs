const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');

code = code.replace(
  'return new Docker({',
  'const d = new Docker({'
);

let worldCode = fs.readFileSync('src/server/controllers/world.ts', 'utf8');
worldCode = worldCode.replace(
  'const { parsed } = await parseNbt(buffer);',
  'const { parsed } = await parseNbt(buffer) as any;'
);
worldCode = worldCode.replace(
  'const chownR = async (dir) => {',
  'const chownR = async (dir: string) => {'
);
fs.writeFileSync('src/server/services/docker.ts', code);
fs.writeFileSync('src/server/controllers/world.ts', worldCode);
