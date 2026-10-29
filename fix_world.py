import re

with open("src/server/controllers/world.ts", "r") as f:
    content = f.read()

content = re.sub(r'    // 6\. Fix ownership\/permissions based on existing files\n    if \(isLocal\) \{.*?\n    \}\n', '', content, flags=re.DOTALL)

with open("src/server/controllers/world.ts", "w") as f:
    f.write(content)
