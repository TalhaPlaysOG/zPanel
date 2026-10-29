const fs = require('fs');
let code = fs.readFileSync('src/components/ServerConsole.tsx', 'utf8');
code = code.replace('await axios.post(`/api/servers/${serverId}/power`, { action: cmd });', 'await axios.post(`/api/servers/${serverId}/${cmd}`);');
fs.writeFileSync('src/components/ServerConsole.tsx', code);
