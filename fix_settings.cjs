const fs = require('fs');
const path = '/app/applet/src/context/SettingsContext.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    'document.documentElement.setAttribute("data-theme", theme || "red");',
    'document.documentElement.setAttribute("data-theme", res.data.theme || "red");'
);
content = content.replace(
    'document.documentElement.setAttribute("data-theme", theme || "red");',
    'document.documentElement.setAttribute("data-theme", "red");'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed fetchSettings');
