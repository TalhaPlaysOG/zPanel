const fs = require('fs');
let content = fs.readFileSync('src/pages/Nodes.tsx', 'utf8');

content = content.replace(
  /\{node\.ip\}\{node\.port !== 6768 && node\.port !== 0 \? \`:\$\{node\.port\}\` : ''\}/g,
  `{node.ip}{node.connectionMode !== 'tunnel' && node.port && node.port !== 6768 && node.port !== 0 ? \`:\${node.port}\` : ''}`
);

fs.writeFileSync('src/pages/Nodes.tsx', content);
