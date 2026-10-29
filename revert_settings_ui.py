import re

with open("src/components/ServerSettings.tsx", "r") as f:
    content = f.read()

# Remove the state variables for the advanced settings
content = re.sub(r'  const \[javaVersion, setJavaVersion\].*?\n  const \[startupCommand, setStartupCommand\].*?\n', '', content, flags=re.DOTALL)

# Revert handleChangeVersion
old_handle_change = """
  const handleChangeVersion = async () => {
    setIsChangingVersion(true);
    setVersionProgress(10);
    // Fake progress interval since server handles the real download synchronously for now
    // In a real app we'd use SSE or websockets to report download progress
    const interval = setInterval(() => {
        setVersionProgress(p => p < 90 ? p + 10 : p);
    }, 500);

    try {
      await axios.put(`/api/servers/${serverId}/version`, { version: selectedVersion, type: selectedType });
      setVersionProgress(100);
      setTimeout(() => {
         window.location.reload();
      }, 1000);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update version");
      setIsChangingVersion(false);
    } finally {
      clearInterval(interval);
    }
  };
"""
content = re.sub(r'  const handleChangeVersion = async \(\) => \{.*?\n  \};\n', old_handle_change, content, flags=re.DOTALL)

start_marker = '<h3 className="text-theme-500 font-bold mb-2 flex items-center">\n                <Sliders className="w-5 h-5 mr-2" /> Minecraft Runtime\n              </h3>'
idx1 = content.find(start_marker)
idx2 = content.find('<Globe className="w-5 h-5 mr-2" /> Server IP Alias')

if idx1 != -1 and idx2 != -1:
    before = content[:idx1]
    
    div_start = before.rfind('<div className="bg-black/40')
    div_start_globe = content.rfind('<div className="bg-black/40', 0, idx2)
    
    new_block = """
            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-theme-500 font-bold mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" /> Change Server Version
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Update the server version (server.jar). 
                <span className="text-theme-500/80 block mt-1">
                  WARNING: The server MUST be stopped before changing the version. Do this at your own risk. Your world backup might be affected. If you have not taken a backup, please take a backup first. Changing the version will delete the old server.jar and download the new one.
                </span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Software Type</label>
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none"
                  >
                    <option value="PAPER">Paper (Performance Minecraft)</option>
                    <option value="VELOCITY">Velocity (Proxy)</option>
                    <option value="BUNGEECORD">BungeeCord (Proxy)</option>
                    <option value="FORGE">Forge (Modded)</option>
                    <option value="FABRIC">Fabric (Modded)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Software Version</label>
                  <SearchableDropdown
                    value={selectedVersion}
                    onChange={setSelectedVersion}
                    options={versions.map(v => ({ value: v, label: v }))}
                    placeholder="Select Version"
                    searchPlaceholder="Search versions..."
                    disabled={isChangingVersion}
                    className="font-mono bg-card"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleChangeVersion}
                    disabled={isChangingVersion || (selectedVersion === server.version && selectedType === server.type)}
                    className="px-6 py-3 bg-theme-600/10 hover:bg-theme-600/20 text-theme-600 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center min-w-[160px] justify-center h-[50px]"
                  >
                    {isChangingVersion ? "Updating..." : "Update Server"}
                  </button>
                </div>
              </div>
              {isChangingVersion && (
                <div className="mt-6 p-4 border border-zinc-800 bg-muted rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-theme-500">Downloading {selectedVersion} and recreating server...</span>
                        <span className="text-sm font-mono text-theme-500/80">{versionProgress}% downloading</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-theme-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${versionProgress}%` }}
                        ></div>
                    </div>
                </div>
              )}
            </div>
"""
    with open("src/components/ServerSettings.tsx", "w") as f:
        f.write(content[:div_start] + new_block + content[div_start_globe:])

