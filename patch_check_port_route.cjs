const fs = require('fs');
let content = fs.readFileSync('src/server/routes/servers.ts', 'utf8');

content = content.replace(
/import \{ getServers, createServer,/g,
"import { getServers, createServer, checkPort,"
);

content = content.replace(
/router\.post\("\/", createServer\);/g,
`router.get("/check-port", checkPort);\nrouter.post("/", createServer);`
);

fs.writeFileSync('src/server/routes/servers.ts', content);
