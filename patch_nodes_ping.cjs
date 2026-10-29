const fs = require('fs');
let content = fs.readFileSync('src/server/routes/nodes.ts', 'utf8');

// Update router.get("/") to give meaningful offline reason
content = content.replace(
  /try \{\s*const docker = await getDocker\(node\.id\);\s*await docker\.ping\(\);\s*node\.status = "online";\s*\} catch \(e: any\) \{\s*console\.error\(\`Ping failed for node \$\{node\.id\}:\`, e\.message \|\| e\);\s*node\.status = "offline";\s*\}/g,
  `try {
      const docker = await getDocker(node.id);
      await docker.ping();
      node.status = "online";
      node.offlineReason = null;
    } catch (e: any) {
      const msg = (e.message || String(e)).toLowerCase();
      let reason = "Connection failed";
      
      if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("token")) {
        reason = "Invalid Token / Unauthorized";
      } else if (msg.includes("enotfound") || msg.includes("dns")) {
        reason = "DNS / Domain not found";
      } else if (msg.includes("timeout") || msg.includes("econnrefused")) {
        reason = "Connection refused / Timeout";
      } else if (msg.includes("404")) {
        reason = "Endpoint not found (404)";
      } else {
        reason = \`Offline (\${e.message || "Unknown error"})\`;
      }
      
      console.error(\`Ping failed for node \${node.id}:\`, e.message || e);
      node.status = "offline";
      node.offlineReason = reason;
    }`
);

fs.writeFileSync('src/server/routes/nodes.ts', content);
