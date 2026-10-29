import re

with open("src/server/routes/nodes.ts", "r") as f:
    content = f.read()

new_get = """
router.get("/", requireAdmin, async (req, res) => {
  // We return both custom nodes and wings nodes if needed, or just combine them.
  // For CreateServer, we MUST return the built-in local node.
  const wingsNodes = (await readJSON("wings_nodes.json")) || [];
  const customNodes = (await readJSON("nodes.json")) || [];
  
  const localNode = {
    id: "local",
    name: "Built-in Node (Local)",
    ip: "127.0.0.1",
    hostname: "localhost",
    apiPort: 3000,
    memory: 8192,
    disk: 50000,
    isLocal: true,
    status: "online"
  };

  const safeWings = wingsNodes.map((n: any) => ({ ...n, token: undefined, ip: n.hostname }));
  const safeCustom = customNodes.map((n: any) => ({ ...n, key: undefined }));

  res.json([localNode, ...safeCustom, ...safeWings]);
});
"""

content = re.sub(r'router\.get\("/", requireAdmin, async \(req, res\) => \{.*?\n\}\);\n', new_get, content, flags=re.DOTALL)

with open("src/server/routes/nodes.ts", "w") as f:
    f.write(content)
