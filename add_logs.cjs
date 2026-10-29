const fs = require('fs');
const path = 'src/server/services/docker.ts';
let code = fs.readFileSync(path, 'utf8');

const startPattern = 'export const startContainer = async (containerId: string, nodeId?: string) => {\n  const docker = await getDocker(nodeId);';
const startReplacement = 'export const startContainer = async (containerId: string, nodeId?: string) => {\n' +
'  console.log("\\n--- START FLOW LOG ---");\n' +
'  console.log("[startContainer] server containerId: " + containerId + ", nodeId: " + nodeId);\n' +
'  const docker = await getDocker(nodeId);\n' +
'  if (docker.modem) {\n' +
'    console.log("[startContainer] using docker modem host: " + docker.modem.host + ", protocol: " + docker.modem.protocol);\n' +
'  }\n' +
'  console.log("----------------------\\n");';

code = code.replace(startPattern, startReplacement);

const getDockerPattern = '    return new Docker({\n      protocol,\n      host,\n      port,\n      headers: {';
const getDockerReplacement = '    console.log("[getDocker] Selected Node URL: " + protocol + "://" + host + ":" + port);\n' +
'    console.log("[getDocker] Configured Node IP string was: " + node.ip + ", connectionMode: " + node.connectionMode);\n' +
'    return new Docker({\n      protocol,\n      host,\n      port,\n      headers: {';

code = code.replace(getDockerPattern, getDockerReplacement);

fs.writeFileSync(path, code, 'utf8');
