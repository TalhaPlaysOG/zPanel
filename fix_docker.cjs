const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');

const t1 = `export const createServerContainer = async (serverData: any, nodeId?: string) => {
  const docker = await getDocker(nodeId || serverData.nodeId);
  if (isNodeSandbox(nodeId)) {`;

const r1 = `export const createServerContainer = async (serverData: any, nodeId?: string) => {
  const docker = await getDocker(nodeId || serverData.nodeId);
  if (isNodeSandbox(nodeId || serverData.nodeId)) {`;

code = code.replace(t1, r1);
fs.writeFileSync('src/server/services/docker.ts', code);
