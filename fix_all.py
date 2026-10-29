import re
import os

# Fix ServerSettings.tsx
settings_path = "src/components/ServerSettings.tsx"
if os.path.exists(settings_path):
    with open(settings_path, "r") as f:
        content = f.read()
    
    states_to_add = """  const [javaVersion, setJavaVersion] = useState(server?.javaVersion || "17");
  const [dockerImage, setDockerImage] = useState(server?.dockerImage || "");
  const [serverJar, setServerJar] = useState(server?.serverJar || "");
  const [startupCommand, setStartupCommand] = useState(server?.startupCommand || "");
"""
    content = re.sub(r'(  const \[versionProgress, setVersionProgress\] = useState\(0\);\n)', r'\1' + states_to_add, content)
    
    with open(settings_path, "w") as f:
        f.write(content)

# Fix servers.ts
servers_path = "src/server/controllers/servers.ts"
if os.path.exists(servers_path):
    with open(servers_path, "r") as f:
        content = f.read()
    
    content = content.replace('const archiver = (await import("archiver")).default;', 'const archiver = (await import("archiver")).default || (await import("archiver"));')
    
    with open(servers_path, "w") as f:
        f.write(content)

# Fix world.ts
world_path = "src/server/controllers/world.ts"
if os.path.exists(world_path):
    with open(world_path, "r") as f:
        content = f.read()
    
    content = content.replace('const archiver = (await import("archiver")).default;', 'const archiver = (await import("archiver")).default || (await import("archiver"));')
    content = content.replace('const searchLevelDat = async (dir: string) => {', 'const searchLevelDat = async (dir: string): Promise<string | null> => {')
    content = content.replace('const res = await searchLevelDat(fullPath);', 'const found = await searchLevelDat(fullPath);')
    content = content.replace('if (res) return res;', 'if (found) return found;')
    
    with open(world_path, "w") as f:
        f.write(content)

print("Fixes applied.")
