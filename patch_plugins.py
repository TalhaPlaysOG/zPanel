import re

with open("src/server/controllers/servers.ts", "r") as f:
    content = f.read()

# For installPlugin
plugin_check = """
  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const pluginCompatibleTypes = ["PAPER", "SPIGOT", "BUKKIT", "PURPUR", "WATERFALL", "BUNGEECORD", "VELOCITY"];
  if (!pluginCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Bukkit/Spigot plugins on a ${server.type} server. This software does not support Bukkit plugins.` });
  }
"""

content = re.sub(r'export const installPlugin = async \(req: Request, res: Response\) => \{\n  const \{ id \} = req\.params;\n', 'export const installPlugin = async (req: Request, res: Response) => {\n' + plugin_check, content)

mod_check = """
  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const modCompatibleTypes = ["FABRIC", "FORGE", "NEOFORGE", "QUILT"];
  if (!modCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Fabric/Forge mods on a ${server.type} server. This software does not support Fabric/Forge mods.` });
  }
"""

content = re.sub(r'export const installMod = async \(req: Request, res: Response\) => \{\n  const \{ id \} = req\.params;\n', 'export const installMod = async (req: Request, res: Response) => {\n' + mod_check, content)

with open("src/server/controllers/servers.ts", "w") as f:
    f.write(content)
