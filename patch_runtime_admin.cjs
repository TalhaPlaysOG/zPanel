const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const runtimeUI = `
              <div className="flex items-start justify-between py-4 border-b border-border-subtle group">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">Default Server Runtime</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Configure how newly created servers are executed. Changing this affects <strong>only new servers</strong>. Existing servers will keep their current runtime.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button"
                      onClick={async () => {
                        setNewDefaultRuntime('docker');
                        try {
                          await axios.put("/api/system/settings", { defaultRuntime: 'docker' });
                          fetchSettings();
                        } catch(err) { console.error(err); }
                      }}
                      className={\`px-4 py-3 rounded-xl border text-left flex-1 transition-all \${newDefaultRuntime === 'docker' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-muted border-border hover:border-border-subtle'}\`}
                    >
                      <div className={\`text-sm font-bold \${newDefaultRuntime === 'docker' ? 'text-indigo-400' : 'text-foreground'}\`}>Docker (Stable)</div>
                      <div className="text-xs text-muted-foreground mt-1">Isolated, secure, standard environment. Recommended for production.</div>
                    </button>

                    <button 
                      type="button"
                      onClick={async () => {
                        if (window.confirm("WARNING: Local Process uses host networking and bypasses Docker isolation. If Java 21 is missing on the host, servers will fail to start. Proceed?")) {
                          setNewDefaultRuntime('local');
                          try {
                            await axios.put("/api/system/settings", { defaultRuntime: 'local' });
                            fetchSettings();
                          } catch(err) { console.error(err); }
                        }
                      }}
                      className={\`px-4 py-3 rounded-xl border text-left flex-1 transition-all \${newDefaultRuntime === 'local' ? 'bg-amber-600/10 border-amber-500' : 'bg-muted border-border hover:border-border-subtle'}\`}
                    >
                      <div className={\`text-sm font-bold \${newDefaultRuntime === 'local' ? 'text-amber-400' : 'text-foreground'}\`}>Local Process (Beta)</div>
                      <div className="text-xs text-muted-foreground mt-1">Direct Node.js spawn. Requires Java 21 on host. No PTY isolation.</div>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-3 font-mono">Note: Repeated runtime changes may cause dependency issues or panel inconsistency. Runtime migration for existing servers is Beta/Coming Soon.</p>
                </div>
              </div>
`;

content = content.replace(
/              <\/div>\n\n            <\/div>/g,
"              </div>\n\n" + runtimeUI + "\n            </div>"
);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
