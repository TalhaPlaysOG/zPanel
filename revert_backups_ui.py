import re

with open("src/components/ServerBackups.tsx", "r") as f:
    content = f.read()

content = re.sub(r'  const handleRestore = async \(filename: string\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = content.replace('RotateCcw', '')

content = re.sub(r'                      <button\n                        onClick=\{\(\) => handleRestore\(backup\.filename\)\}\n                        title="Restore"\n                        className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"\n                      >\n                        <RotateCcw className="w-5 h-5" />\n                      </button>\n', '', content, flags=re.DOTALL)

with open("src/components/ServerBackups.tsx", "w") as f:
    f.write(content)
