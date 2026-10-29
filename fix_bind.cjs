const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');
code = code.replace(
  'const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);',
  `const isLocal = (!nodeId || nodeId === "local");
  const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);
  const containerBindPath = isLocal ? serverDir : \`/opt/jtg-panel-node/servers/\${serverData.id}\`;`
);
code = code.replace(
  'Binds: [\`\${serverDir}:\${isProxy ? \'/server\' : \'/data\'}\`]',
  'Binds: [\`\${containerBindPath}:\${isProxy ? \'/server\' : \'/data\'}\`]'
);
fs.writeFileSync('src/server/services/docker.ts', code);
