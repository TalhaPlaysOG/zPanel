const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/allowedHosts: \[.*?\]/g, 'allowedHosts: true');
fs.writeFileSync('vite.config.ts', code);
