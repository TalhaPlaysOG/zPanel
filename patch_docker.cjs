const fs = require('fs');
const path = 'src/server/services/docker.ts';
let content = fs.readFileSync(path, 'utf8');

const isSandboxDef = "export const isSandbox = !isDockerEnabled || (!fs.existsSync('/var/run/docker.sock') &&
  !fs.existsSync('/run/docker.sock') &&
  !(process.env.DOCKER_SOCKET_PATH && fs.existsSync(process.env.DOCKER_SOCKET_PATH)) &&
  process.platform !== 'win32');";

const isNodeSandboxHelper = isSandboxDef + "

export const isNodeSandbox = (nodeId?: string) => {
  if (!nodeId || nodeId === 'local') return isSandbox;
  return false;
};";

content = content.replace(isSandboxDef, isNodeSandboxHelper);

content = content.replace(
  /export const createServerContainer = async \(serverData: any, nodeId\?: string\) => \{\s*const docker = await getDocker\((nodeId \|\| serverData\.nodeId)\);\s*if \(isSandbox\) \{/g,
  "export const createServerContainer = async (serverData: any, nodeId?: string) => {
  const docker = await getDocker(nodeId || serverData.nodeId);
  if (isNodeSandbox(nodeId || serverData.nodeId)) {"
);

content = content.replace(
  /const docker = await getDocker\(nodeId\);\s*if \(isSandbox\) \{/g,
  "const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {"
);

content = content.replace(
  /const docker = await getDocker\(nodeId\);\s*if \(isSandbox\) return/g,
  "const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) return"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');

