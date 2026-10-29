import re

with open("src/components/ServerSettings.tsx", "r") as f:
    content = f.read()

start_marker = '<h3 className="text-theme-500 font-bold mb-2 flex items-center">\n                <AlertTriangle className="w-5 h-5 mr-2" /> Change Server Version\n              </h3>'
end_marker = '<!-- END RUNTIME -->' # wait, let's just find the `Globe` icon

idx1 = content.find('<AlertTriangle className="w-5 h-5 mr-2" /> Change Server Version')
idx2 = content.find('<Globe className="w-5 h-5 mr-2" /> Server IP Alias')

if idx1 != -1 and idx2 != -1:
    before = content[:idx1]
    after = content[idx2:]
    
    # We need to find the start of the div for idx1
    div_start = before.rfind('<div className="bg-black/40')
    div_end = content.rfind('</div>', 0, idx2)
    # Actually, idx2 is inside an h3, its div start is before it.
    div_start_globe = content.rfind('<div className="bg-black/40', 0, idx2)
    
    new_block = """
            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-theme-500 font-bold mb-2 flex items-center">
                <Sliders className="w-5 h-5 mr-2" /> Minecraft Runtime
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Configure server software, Java version, and Docker image.
                <span className="text-theme-500/80 block mt-1">
                  WARNING: The server MUST be stopped before changing the runtime. A backup will be created automatically.
                </span>
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Software Type</label>
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none"
                  >
                    <option value="VANILLA">Vanilla</option>
                    <option value="PAPER">Paper</option>
                    <option value="SPIGOT">Spigot</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="FORGE">Forge</option>
                    <option value="NEOFORGE">NeoForge</option>
                    <option value="QUILT">Quilt</option>
                  </select>
                </div>
                <div>
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
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Java Version</label>
                  <select
                    value={javaVersion}
                    onChange={e => setJavaVersion(e.target.value)}
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none"
                  >
                    <option value="">Auto-detect</option>
                    <option value="8">Java 8</option>
                    <option value="11">Java 11</option>
                    <option value="16">Java 16</option>
                    <option value="17">Java 17</option>
                    <option value="21">Java 21</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Docker Image</label>
                  <input
                    type="text"
                    value={dockerImage}
                    onChange={e => setDockerImage(e.target.value)}
                    placeholder="e.g. ghcr.io/pterodactyl/yolks:java_17"
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Server JAR</label>
                  <input
                    type="text"
                    value={serverJar}
                    onChange={e => setServerJar(e.target.value)}
                    placeholder="e.g. server.jar"
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Startup Command</label>
                  <input
                    type="text"
                    value={startupCommand}
                    onChange={e => setStartupCommand(e.target.value)}
                    placeholder="e.g. java -Xms1G -Xmx4G -jar server.jar --nogui"
                    disabled={isChangingVersion}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleChangeVersion}
                    disabled={isChangingVersion}
                    className="px-6 py-3 bg-theme-600/10 hover:bg-theme-600/20 text-theme-600 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center min-w-[160px] justify-center h-[50px]"
                  >
                    {isChangingVersion ? "Updating..." : "Update Runtime"}
                  </button>
              </div>
              {isChangingVersion && (
                <div className="mt-6 p-4 border border-zinc-800 bg-muted rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-theme-500">Updating runtime configuration...</span>
                        <span className="text-sm font-mono text-theme-500/80">{versionProgress}%</span>
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

