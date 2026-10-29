const fs = require('fs');
let content = fs.readFileSync('src/server/services/docker.ts', 'utf8');

const startStr = "export const getDocker = async (nodeId?: string) => {";
const endStr = "  return defaultDocker;\n};";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newDockerFunc = `export const getDocker = async (nodeId?: string) => {
  if (!nodeId || nodeId === "local") return defaultDocker;
  const nodes = await readJSON("nodes.json") || [];
  const node = nodes.find((n: any) => n.id === nodeId);
  if (node) {
    let host = node.ip;
    let protocol: "http" | "https" | "ssh" = "http";
    let port = node.port;

    if (node.connectionMode === "tunnel") {
      // Tunnel mode: use URL exactly as provided, ignoring port
      try {
        if (!host.startsWith("http://") && !host.startsWith("https://")) {
           host = "https://" + host;
        }
        const url = new URL(host);
        protocol = (url.protocol.replace(':', '') === 'https' ? 'https' : 'http');
        host = url.hostname;
        port = url.port ? parseInt(url.port) : (protocol === "https" ? 443 : 80);
      } catch (e) {
        console.error("Invalid URL in Tunnel Mode node", host);
      }
    } else {
      // Direct mode: Host + Port
      if (!host.startsWith("http://") && !host.startsWith("https://") && port === 443) {
        protocol = "https";
      }

      if (host.startsWith("http://") || host.startsWith("https://")) {
        try {
          const url = new URL(host);
          protocol = (url.protocol.replace(':', '') === 'https' ? 'https' : 'http');
          host = url.hostname;
          if (url.port) port = parseInt(url.port);
          else port = protocol === "https" ? 443 : 80;
        } catch (e) {
          console.error("Invalid URL in node IP", host);
        }
      }
    }

    return new Docker({
      protocol,
      host,
      port,
      headers: { 
        Authorization: "Bearer " + node.key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
  }
  return defaultDocker;
};`;
  content = content.substring(0, startIndex) + newDockerFunc + content.substring(endIndex);
  fs.writeFileSync('src/server/services/docker.ts', content);
  console.log("Successfully patched getDocker");
} else {
  console.log("Failed to find getDocker bounds");
}
