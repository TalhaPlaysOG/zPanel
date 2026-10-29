const fs = require('fs');
let code = fs.readFileSync('src/server/routes/system.ts', 'utf8');

code = code.replace(
  '(c) => c.status',
  '(c: any) => c.status'
);

fs.writeFileSync('src/server/routes/system.ts', code);
