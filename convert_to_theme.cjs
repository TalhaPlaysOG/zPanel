const fs = require('fs');
const path = require('path');

const replacements = [
    [/red-(\d{2,3})/g, 'theme-$1'],
    [/#ef4444/ig, 'var(--color-theme-500)'],
    [/#dc2626/ig, 'var(--color-theme-600)'],
    [/#b91c1c/ig, 'var(--color-theme-700)'],
    [/#991b1b/ig, 'var(--color-theme-800)'],
    [/#f87171/ig, 'var(--color-theme-400)'],
    [/#fca5a5/ig, 'var(--color-theme-300)'],
    [/#fecaca/ig, 'var(--color-theme-200)'],
    [/#fee2e2/ig, 'var(--color-theme-100)'],
    [/rgba\(220,38,38,/g, 'rgba(var(--theme-rgb-600),'],
    [/rgba\(239,68,68,/g, 'rgba(var(--theme-rgb-500),'],
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
console.log('All files converted to theme');
