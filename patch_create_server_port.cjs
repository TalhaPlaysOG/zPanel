const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

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
/                  <label className="flex items-center gap-2 text-sm text-\[\#8f8f8f\] mb-2\.5">\n                    <Globe className="w-4 h-4" \/> IP Alias/g,
portUI + '\n                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">\n                    <Globe className="w-4 h-4" /> IP Alias'
);

fs.writeFileSync('src/pages/CreateServer.tsx', content);
