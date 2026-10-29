const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'if (isMain && process.env.TEST_ENV !== "true") {',
  'console.log("IS MAIN:", isMain, "TEST_ENV:", process.env.TEST_ENV);\nif (true) {'
);
fs.writeFileSync('server.ts', code);
