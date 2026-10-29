const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');
const search = "process.platform !== 'win32');";
const replace = search + "\\n\\nexport const isNodeSandbox = (nodeId?: string) => {\\n  if (!nodeId || nodeId === 'local') return isSandbox;\\n  return false;\\n};";
code = code.replace(search, replace);
fs.writeFileSync('src/server/services/docker.ts', code);
