const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');

// Inside getDocker, add logging
const searchGetDocker = \`    return new Docker({\`;
const replaceGetDocker = \`    console.log(\\\`[getDocker] Selected Node URL: \${protocol}://\${host}:\${port}\\\`);
    console.log(\\\`[getDocker] Configured Node IP string was: \${node.ip}, connectionMode: \${node.connectionMode}\\\`);
    return new Docker({\`;

if (code.includes(searchGetDocker) && !code.includes('[getDocker] Selected Node URL:')) {
  code = code.replace(searchGetDocker, replaceGetDocker);
}

// Inside startContainer, add logging
const searchStart = \`export const startContainer = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);\`;
const replaceStart = \`export const startContainer = async (containerId: string, nodeId?: string) => {
  console.log(\\\`\\n--- START FLOW LOG ---\\\`);
  console.log(\\\`[startContainer] server containerId: \${containerId}, nodeId: \${nodeId}\\\`);
  const docker = await getDocker(nodeId);
  console.log(\\\`[startContainer] using docker modem host: \${docker.modem.host}, protocol: \${docker.modem.protocol}\\\`);
  console.log(\\\`----------------------\\n\\\`);\`;

if (code.includes(searchStart) && !code.includes('[startContainer] server containerId')) {
  code = code.replace(searchStart, replaceStart);
}

fs.writeFileSync('src/server/services/docker.ts', code);
console.log('Patched logging');
