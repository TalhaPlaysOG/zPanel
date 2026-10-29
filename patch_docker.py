import re

with open("src/server/services/docker.ts", "r") as f:
    content = f.read()

new_logic = """
  let shortImage = isProxy ? "itzg/bungeecord:latest" : "itzg/minecraft-server:latest";
  let fullImage = isProxy ? "docker.io/itzg/bungeecord:latest" : "docker.io/itzg/minecraft-server:latest";
  
  if (serverData.dockerImage) {
    shortImage = serverData.dockerImage;
    fullImage = serverData.dockerImage;
  }
"""

content = re.sub(r'const shortImage = .*;\n  const fullImage = .*;\n', new_logic, content)

new_build_options = """
  const buildContainerOptions = (img: string) => {
    let binds = [`${containerBindPath}:${isProxy ? '/server' : '/data'}`];
    let workingDir = undefined;
    let cmd = undefined;
    
    if (serverData.dockerImage && serverData.dockerImage.includes('pterodactyl')) {
      binds = [`${containerBindPath}:/home/container`];
      workingDir = "/home/container";
      if (serverData.startupCommand) {
        cmd = ["/bin/sh", "-c", serverData.startupCommand];
      }
    }
    
    return {
      Image: img,
      name: `jtg-server-${serverData.id}`,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      Env: envVars,
      WorkingDir: workingDir,
      Cmd: cmd,
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
        Binds: binds
      }
    };
  };
"""

content = re.sub(r'  const buildContainerOptions = \(img: string\) => \(\{.*?\n    \}\n  \}\);\n', new_build_options, content, flags=re.DOTALL)

with open("src/server/services/docker.ts", "w") as f:
    f.write(content)

