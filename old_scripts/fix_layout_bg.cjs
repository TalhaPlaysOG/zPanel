const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');
content = content.replace('bg-ink/90', 'bg-ink');
fs.writeFileSync('src/components/Layout.tsx', content);
