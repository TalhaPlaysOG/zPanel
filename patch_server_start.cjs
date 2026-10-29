const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace startServer(); at the bottom
content = content.replace(/^startServer\(\);/m, `
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
