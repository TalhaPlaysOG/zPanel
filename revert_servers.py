import re

with open("src/server/controllers/servers.ts", "r") as f:
    content = f.read()

content = re.sub(r'export const updateRuntime = async \(req: Request, res: Response\) => \{.*?\n\};\n', '', content, flags=re.DOTALL)
content = re.sub(r'export const restoreBackup = async \(req: Request, res: Response\) => \{.*?\n\};\n', '', content, flags=re.DOTALL)

with open("src/server/controllers/servers.ts", "w") as f:
    f.write(content)
