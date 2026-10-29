const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'server: { middlewareMode: true },',
  'server: { middlewareMode: true, allowedHosts: true },'
);
fs.writeFileSync('server.ts', code);
