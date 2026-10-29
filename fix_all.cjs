const fs = require('fs');

// Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  'server: { middlewareMode: true, allowedHosts: true },',
  'server: { middlewareMode: true, allowedHosts: ["gtk.qzz.io"] },'
);
serverCode = serverCode.replace(
  'httpServer.listen(PORT, () => {',
  'httpServer.listen(PORT, "0.0.0.0", () => {'
);
fs.writeFileSync('server.ts', serverCode);

// Fix vite.config.ts
let viteCode = fs.readFileSync('vite.config.ts', 'utf8');
viteCode = viteCode.replace(/allowedHosts: true/g, 'allowedHosts: ["gtk.qzz.io"]');
fs.writeFileSync('vite.config.ts', viteCode);

