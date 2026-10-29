const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

content = content.replace(
/<span className="block font-display font-bold text-sm text-white mb-1">Local Process<\/span>\s*<span className="block text-\[11px\] text-\[#8f8f8f\] font-mono leading-tight">Runs natively\. WARNING: Uses host networking directly<\/span>/m,
`<span className="block font-display font-bold text-sm text-white mb-1">Local Process (Beta)</span>
        <span className="block text-[11px] text-[#8f8f8f] font-mono leading-tight">Best tested on VPS. Requires Java 21 installed. May not work in restricted dev/sandbox environments.</span>`
);

fs.writeFileSync('src/pages/CreateServer.tsx', content);
