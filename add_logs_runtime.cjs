const fs = require('fs');
const path = 'src/server/services/runtime.ts';
let code = fs.readFileSync(path, 'utf8');

const startPattern = 'export const startServerRuntime = async (server: any) => {\n  if (server.runtimeType === "local") {';
const startReplacement = 'export const startServerRuntime = async (server: any) => {\n' +
'  console.log("\\n=== STARTING SERVER ===");\n' +
'  console.log("Server ID: " + server.id);\n' +
'  console.log("Runtime Type: " + server.runtimeType);\n' +
'  if (server.runtimeType === "local") {';
code = code.replace(startPattern, startReplacement);

fs.writeFileSync(path, code, 'utf8');
