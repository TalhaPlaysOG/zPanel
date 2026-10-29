const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// Add defaultRuntime to destructuring
content = content.replace(
/    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId,/g,
"    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, defaultRuntime,"
);

// Add state
content = content.replace(
/  const \[newTheme, setNewTheme\] = useState\(theme\);/g,
"  const [newTheme, setNewTheme] = useState(theme);\n  const [newDefaultRuntime, setNewDefaultRuntime] = useState(defaultRuntime || 'docker');"
);

// Add to save call
content = content.replace(
/        enableRegistration: newEnableRegistration,\n        theme: newTheme\n      \}\);/g,
"        enableRegistration: newEnableRegistration,\n        theme: newTheme,\n        defaultRuntime: newDefaultRuntime\n      });"
);

// Add UI section for runtime
const runtimeUI = `
        <div className="bg-[#0e0e0e] border border-[#232323] p-6 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-transparent"></div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#161616] border border-[#232323] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-bold tracking-wide text-sm mb-1 text-white">DEFAULT SERVER RUNTIME</h2>
              <p className="text-[#8f8f8f] text-xs font-mono mb-6 leading-relaxed max-w-2xl">
                Configure how new servers are executed. Changing this affects <strong className="text-white">only new servers</strong>. Existing servers will keep their current runtime.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => setNewDefaultRuntime('docker')}
                  className={\`p-4 text-left border \${newDefaultRuntime === 'docker' ? 'border-white bg-white/5' : 'border-[#232323] hover:border-[#4c4c4c]'} transition-colors\`}
                >
                  <div className="font-display font-bold text-sm text-white mb-1">Docker (Stable)</div>
                  <div className="text-[11px] text-[#8f8f8f] font-mono leading-tight">Isolated, secure, standard environment. Recommended for production.</div>
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("WARNING: Local Process uses host networking and bypasses Docker isolation. If Java is missing on the host, servers will fail to start. Proceed?")) {
                      setNewDefaultRuntime('local');
                    }
                  }}
                  className={\`p-4 text-left border \${newDefaultRuntime === 'local' ? 'border-white bg-white/5' : 'border-[#232323] hover:border-[#4c4c4c]'} transition-colors\`}
                >
                  <div className="font-display font-bold text-sm text-white mb-1">Local Process (Beta)</div>
                  <div className="text-[11px] text-[#8f8f8f] font-mono leading-tight">Direct Node.js spawn. Requires Java 21 on host. No PTY isolation.</div>
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button onClick={handleSaveUI} disabled={isSavingUI} className="h-10 px-6 bg-white text-black font-display font-bold text-xs tracking-wide hover:bg-[#e0e0e0] transition-colors disabled:opacity-50">
                  {isSavingUI ? "SAVING..." : "SAVE RUNTIME PREFERENCE"}
                </button>
                {statusMsgUI && <span className={\`text-xs font-mono \${statusMsgUI.type === "success" ? "text-green-400" : "text-red-400"}\`}>{statusMsgUI.text}</span>}
              </div>
            </div>
          </div>
        </div>
`;

content = content.replace(
/        <div className="bg-\[\#0e0e0e\] border border-\[\#232323\] p-6 mb-8 relative overflow-hidden group">/m,
runtimeUI + '\n        <div className="bg-[#0e0e0e] border border-[#232323] p-6 mb-8 relative overflow-hidden group">'
);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
