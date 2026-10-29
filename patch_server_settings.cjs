const fs = require('fs');
let content = fs.readFileSync('src/components/ServerSettings.tsx', 'utf8');

const migrationUI = `
            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-blue-400 font-bold mb-2 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2" /> Runtime Migration (Beta / Coming Soon)
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Migrate this server between Docker and Local Process runtimes. 
                <span className="text-blue-400/80 block mt-1">
                  WARNING: This may fail. You must review your files and port bindings after migration. The server must be stopped first.
                </span>
              </p>
              
              <div className="flex items-center gap-4">
                <button 
                  disabled
                  className="bg-blue-600/50 text-blue-200 px-4 py-2 rounded font-bold cursor-not-allowed text-sm"
                >
                  Convert to {server.runtimeType === 'local' ? 'Docker' : 'Local Process'} (Coming Soon)
                </button>
              </div>
            </div>
`;

content = content.replace(
/            <div className="bg-black\/40 dark:bg-black\/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-\[0_0_40px_-15px_rgba\(0,0,0,0\.5\)\] ring-1 ring-border-subtle relative z-30 group hover:bg-black\/60 transition-colors mb-8">/m,
migrationUI + '\n            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">'
);

fs.writeFileSync('src/components/ServerSettings.tsx', content);
