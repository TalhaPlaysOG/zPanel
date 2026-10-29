const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

// Update initial state
content = content.replace(
/name: '', desc: '', ram: 4, cpu: 150, disk: 10, ip: '', runtimeType: 'docker', /g,
"name: '', desc: '', ram: 4, cpu: 150, disk: 10, ip: '', port: 25565, runtimeType: 'docker', "
);

// Add Network port UI just before Globe IP Alias
const portUI = `
                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                    <Network className="w-4 h-4" /> Server Port
                  </label>
                  <input 
                    type="number" className="inp font-mono mb-4" placeholder="25565" 
                    value={state.port} onChange={e => updateState('port', Number(e.target.value))}
                  />
                  <p className="text-[11px] text-[#4c4c4c] -mt-2 mb-8 font-mono">The main port the server will bind to. Must not be in use.</p>
`;

content = content.replace(
/                  <label className="flex items-center gap-2 text-sm text=\[\#8f8f8f\] mb-2\.5">\s*<Globe className="w-4 h-4" \/> IP Alias/g,
portUI + '\n                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">\n                    <Globe className="w-4 h-4" /> IP Alias'
);

// Update payload
content = content.replace(
/port: 25565, \/\/ default/g,
"port: state.port,"
);

// Review page
content = content.replace(
/\{renderReviewRow\('DESCRIPTION', state\.desc \|\| '—'\)\}/g,
"{renderReviewRow('DESCRIPTION', state.desc || '—')}\n                        {renderReviewRow('PORT', String(state.port))}"
);

// Initial effect to load default runtime
content = content.replace(
/  useEffect\(\(\) => \{/g,
`  const { defaultRuntime } = useSettings();\n  useEffect(() => {\n    if (defaultRuntime) {\n      updateState('runtimeType', defaultRuntime);\n    }\n  }, [defaultRuntime]);\n  useEffect(() => {`
);

// Import Network icon if missing, wait it's already there in lucide-react imports:
// Network,
// Wrench, Feather, Info

fs.writeFileSync('src/pages/CreateServer.tsx', content);
