const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/if \(process\.env\.TEST_ENV !== "true"\) \{\n  startServer\(\);\n\}/, `
// Only start server if not imported as a module in tests
const isMain = 
  (typeof require !== 'undefined' && require.main === module) || 
  (process.argv[1] && process.argv[1].includes('server.ts')) ||
  (process.argv[1] && process.argv[1].includes('server.cjs'));

if (isMain && process.env.TEST_ENV !== "true") {
  startServer();
}
`);
fs.writeFileSync('server.ts', content);
