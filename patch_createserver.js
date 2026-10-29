const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

// Insert Runtime Environment before Deployment Node
content = content.replace(
  /<label className="flex items-center gap-2 text-sm text-\[\#8f8f8f\] mb-2.5">\s*<Radio className="w-4 h-4" \/> Deployment Node\s*<\/label>/,
  `
    <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
      <Radio className="w-4 h-4" /> Runtime Environment
    </label>
    <div className="flex gap-4 mb-2">
      <button 
        type="button" 
        onClick={() => updateState('runtimeType', 'docker')}
        className={\`flex-1 p-3 border \${state.runtimeType === 'docker' ? 'border-white bg-white/5' : 'border-[#232323] hover:border-[#4c4c4c]'} text-left\`}
      >
        <span className="block font-display font-bold text-sm text-white mb-1">Docker Container</span>
        <span className="block text-[11px] text-[#8f8f8f] font-mono leading-tight">Isolated, secure, requires Docker engine</span>
      </button>
      <button 
        type="button" 
        onClick={() => updateState('runtimeType', 'local')}
        className={\`flex-1 p-3 border \${state.runtimeType === 'local' ? 'border-white bg-white/5' : 'border-[#232323] hover:border-[#4c4c4c]'} text-left\`}
      >
        <span className="block font-display font-bold text-sm text-white mb-1">Local Process</span>
        <span className="block text-[11px] text-[#8f8f8f] font-mono leading-tight">Runs natively. WARNING: Uses host networking directly</span>
      </button>
    </div>
    <p className="text-[11px] text-[#4c4c4c] mt-2 mb-8 font-mono">How this server should be executed.</p>

    <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
      <Radio className="w-4 h-4" /> Deployment Node
    </label>
  `
);
fs.writeFileSync('src/pages/CreateServer.tsx', content);
