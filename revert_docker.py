import re

with open("src/server/services/docker.ts", "r") as f:
    content = f.read()

content = re.sub(r'  let shortImage = isProxy \? "itzg/bungeecord:latest" : "itzg/minecraft-server:latest";.*?  if \(serverData\.dockerImage\) \{.*?  \}', '  const shortImage = isProxy ? "itzg/bungeecord:latest" : "itzg/minecraft-server:latest";\n  const fullImage = isProxy ? "docker.io/itzg/bungeecord:latest" : "docker.io/itzg/minecraft-server:latest";', content, flags=re.DOTALL)

old_build_options = """  const buildContainerOptions = (img: string) => ({
    Image: img,
    name: `jtg-server-${serverData.id}`,
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    Env: envVars,
    ExposedPorts: {
      [`${serverData.port}/tcp`]: {}
    },
    HostConfig: {
      PortBindings: {
        [`${serverData.port}/tcp`]: [
          {
            HostPort: `${serverData.port}`
          }
        ]
      },
      Binds: [`${containerBindPath}:${isProxy ? '/server' : '/data'}`]
    }
  });"""

content = re.sub(r'  const buildContainerOptions = \(img: string\) => \{.*?    \};\n  \};', old_build_options, content, flags=re.DOTALL)

with open("src/server/services/docker.ts", "w") as f:
    f.write(content)
