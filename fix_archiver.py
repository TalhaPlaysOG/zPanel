import os

for path in ["src/server/controllers/servers.ts", "src/server/controllers/world.ts"]:
    with open(path, "r") as f:
        content = f.read()
    content = content.replace('const archiver = (await import("archiver")).default || (await import("archiver"));', 'const archiver = require("archiver");')
    content = content.replace('const extract = (await import("extract-zip")).default;', 'const extract = require("extract-zip");')
    with open(path, "w") as f:
        f.write(content)
print("Done.")
