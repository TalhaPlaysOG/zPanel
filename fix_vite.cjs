const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/allowedHosts:\s*true,/g, 'allowedHosts: ["gtk.qzz.io", "node.gtk.qzz.io", "all"],');
fs.writeFileSync('vite.config.ts', code);
