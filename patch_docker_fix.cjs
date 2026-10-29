const fs = require('fs');
const path = 'src/server/services/docker.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix the mess:
content = content.replace(/if \\(isNodeSandbox\\(nodeId \\|\\| \\(serverData if \\(isNodeSandbox\\(nodeId\\)\\) \\{if \\(isNodeSandbox\\(nodeId\\)\\) \\{ serverData.nodeId\\)\\)\\) \\{/g, 'if (isNodeSandbox(nodeId)) {');

content = content.replace(/if \\(isNodeSandbox\\(nodeId \\|\\| \\(serverData && serverData.nodeId\\)\\)\\) \\{/g, 'if (isNodeSandbox(nodeId)) {');

// Now, correctly replace only the one inside createServerContainer
content = content.replace(
  /export const createServerContainer = async \\(serverData: any, nodeId\\?: string\\) => \\{\\s*const docker = await getDocker\\((nodeId \\|\\| serverData\\.nodeId)\\);\\s*if \\(isNodeSandbox\\(nodeId\\)\\) \\{/g,
  "export const createServerContainer = async (serverData: any, nodeId?: string) => {\\n  const docker = await getDocker(nodeId || serverData.nodeId);\\n  if (isNodeSandbox(nodeId || serverData.nodeId)) {"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed');
