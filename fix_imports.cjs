const fs = require('fs');
const path = 'src/pages/AdminSettingsPage.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('import { Check, ') && !lines[i].includes('lucide-react')) {
        lines[i] = lines[i].replace('import { Check, ', 'import { ');
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
