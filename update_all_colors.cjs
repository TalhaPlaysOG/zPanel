const fs = require('fs');
const path = require('path');

const replacements = [
    [/indigo-500/g, 'red-600'],
    [/indigo-400/g, 'red-500'],
    [/indigo-600/g, 'red-700'],
    [/indigo-300/g, 'red-300'],
    [/indigo-200/g, 'red-200'],
    [/indigo-100/g, 'red-100'],
    [/cyan-400/g, 'zinc-100'],
    [/cyan-500/g, 'zinc-500'],
    [/cyan-300/g, 'zinc-300'],
    [/emerald-400/g, 'red-500'],
    [/emerald-500/g, 'red-600'],
    [/emerald-300/g, 'red-400'],
    [/emerald-600/g, 'red-700'],
    [/teal-400/g, 'zinc-300'],
    [/teal-500/g, 'zinc-400'],
    [/purple-500/g, 'red-800'],
    [/purple-400/g, 'red-700'],
    [/purple-300/g, 'red-600'],
    [/purple-200/g, 'red-200'],
    [/purple-100/g, 'red-100'],
    [/fuchsia-400/g, 'red-700'],
    [/sky-400/g, 'zinc-200'],
    [/sky-100/g, 'zinc-100'],
    [/amber-400/g, 'red-500'],
    [/amber-500/g, 'red-600'],
    [/rose-500/g, 'red-600'],
    [/rose-400/g, 'red-400'],
    [/blue-400/g, 'zinc-400'],
    [/slate-950/g, 'zinc-950'],
    [/slate-900/g, 'zinc-900'],
    [/slate-800/g, 'zinc-800'],
    [/slate-600/g, 'zinc-600'],
    [/slate-500/g, 'zinc-500'],
    [/slate-400/g, 'zinc-400'],
    [/slate-300/g, 'zinc-300'],
    [/slate-100/g, 'zinc-100'],
    [/#34d399/g, '#ef4444'], 
    [/#38bdf8/g, '#d4d4d8'], 
    [/#818cf8/g, '#ef4444'], 
    [/#c084fc/g, '#991b1b'], 
    [/#2dd4bf/g, '#d4d4d8'], 
    [/#fbbf24/g, '#f87171'], 
    [/#60a5fa/g, '#ef4444'], 
    [/#10b981/g, '#dc2626'], 
    [/#06b6d4/g, '#ef4444'], 
    [/#a855f7/g, '#b91c1c'], 
    [/#4f46e5/g, '#dc2626'], 
    [/#0284c7/g, '#991b1b'],
    [/#6366f1/g, '#991b1b'],
    [/#05070f/g, '#09090b'],
    [/#1e293b/g, '#27272a'],
    [/rgba\(99,102,241,/g, 'rgba(220,38,38,'], 
    [/rgba\(6,182,212,/g, 'rgba(220,38,38,'], 
    [/rgba\(56,189,248,/g, 'rgba(220,38,38,'], 
    [/rgba\(52,211,153,/g, 'rgba(239,68,68,'], 
    [/rgba\(129,140,248,/g, 'rgba(239,68,68,'],
    [/rgba\(251,191,36,/g, 'rgba(239,68,68,'],
    [/rgba\(255,255,255,/g, 'rgba(255,255,255,'],
];

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;
            replacements.forEach(([regex, replacement]) => {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    updated = true;
                }
            });
            if (updated) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory('/app/applet/src');
console.log('All files updated');
