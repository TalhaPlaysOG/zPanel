const fs = require('fs');

const path = '/app/applet/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
    [/indigo-500/g, 'red-600'],
    [/indigo-400/g, 'red-500'],
    [/indigo-600/g, 'red-700'],
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
    [/sky-400/g, 'zinc-200'],
    [/amber-400/g, 'red-500'],
    [/amber-500/g, 'red-600'],
    [/rose-500/g, 'red-600'],
    [/blue-400/g, 'zinc-400'],
    [/slate-950/g, 'zinc-950'],
    [/slate-900/g, 'zinc-900'],
    [/slate-800/g, 'zinc-800'],
    [/slate-400/g, 'zinc-400'],
    [/slate-300/g, 'zinc-300'],
    [/#34d399/g, '#ef4444'], // emerald-400 -> red-500
    [/#38bdf8/g, '#d4d4d8'], // sky-400 -> zinc-300
    [/#818cf8/g, '#ef4444'], // indigo-400 -> red-500
    [/#c084fc/g, '#991b1b'], // purple-400 -> red-800
    [/#2dd4bf/g, '#d4d4d8'], // teal-400 -> zinc-300
    [/#fbbf24/g, '#f87171'], // amber-400 -> red-400
    [/#60a5fa/g, '#ef4444'], // blue-400 -> red-500
    [/#10b981/g, '#dc2626'], // emerald-500 -> red-600
    [/#06b6d4/g, '#ef4444'], // cyan-500 -> red-500
    [/#a855f7/g, '#b91c1c'], // purple-500 -> red-700
    [/#4f46e5/g, '#dc2626'], // indigo-600 -> red-600
    [/#0284c7/g, '#991b1b'], // sky-600 -> red-800
    [/rgba\(99,102,241,/g, 'rgba(220,38,38,'], // indigo
    [/rgba\(6,182,212,/g, 'rgba(220,38,38,'], // cyan
    [/rgba\(56,189,248,/g, 'rgba(220,38,38,'], // sky
    [/rgba\(52,211,153,/g, 'rgba(239,68,68,'], // emerald
    [/rgba\(129,140,248,/g, 'rgba(239,68,68,'],
    [/rgba\(251,191,36,/g, 'rgba(239,68,68,'],
    [/rgba\(255,255,255,/g, 'rgba(255,255,255,'],
];

replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Colors updated');
