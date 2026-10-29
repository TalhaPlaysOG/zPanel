import re

with open("src/components/ServerSettings.tsx", "r") as f:
    content = f.read()

# Add states for javaVersion, dockerImage, serverJar, startupCommand
states_to_add = """
  const [selectedVersion, setSelectedVersion] = useState(server?.version || "");
  const [selectedType, setSelectedType] = useState(server?.type || "PAPER");
  
  const [javaVersion, setJavaVersion] = useState(server?.javaVersion || "");
  const [dockerImage, setDockerImage] = useState(server?.dockerImage || "");
  const [serverJar, setServerJar] = useState(server?.serverJar || "");
  const [startupCommand, setStartupCommand] = useState(server?.startupCommand || "");
"""

content = re.sub(r'  const \[selectedVersion, setSelectedVersion\] = useState\(server\?\.version \|\| ""\);\n  const \[selectedType, setSelectedType\] = useState\(server\?\.type \|\| "PAPER"\);', states_to_add, content)

handle_change = """
  const handleChangeVersion = async () => {
    setIsChangingVersion(true);
    setVersionProgress(10);
    try {
      await axios.put(`/api/servers/${serverId}/runtime`, { 
         version: selectedVersion, 
         type: selectedType,
         javaVersion,
         dockerImage,
         serverJar,
         startupCommand
      });
      setVersionProgress(100);
      setTimeout(() => {
         window.location.reload();
      }, 1000);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update runtime");
      setIsChangingVersion(false);
    }
  };
"""

content = re.sub(r'  const handleChangeVersion = async \(\) => \{.*?\n  \};\n', handle_change, content, flags=re.DOTALL)

ui_block_old = r'<div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-\[0_0_40px_-15px_rgba\(0,0,0,0\.5\)\] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">\s*<h3 className="text-theme-500 font-bold mb-2 flex items-center">\s*<AlertTriangle className="w-5 h-5 mr-2" /> Change Server Version\s*</h3>.*?</div>\s*</div>\s*</div>\s*</div>\s*\)\}\s*</div>'

# wait the regex is tricky. Let's just find the exact block and replace it.

