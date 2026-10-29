const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'const PORT = process.env.PORT || 6767;',
  'const PORT = process.env.NODE_ENV === "production" ? 6767 : 3000;'
);
fs.writeFileSync('server.ts', code);
