const fs = require('fs');
const path = '/app/applet/src/index.css';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /box-shadow: 0 10px 25px -5px rgba\(0, 0, 0, 0\.5\), 0 8px 10px -6px rgba\(0, 0, 0, 0\.5\);\n}/g,
    ''
);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed CSS');
