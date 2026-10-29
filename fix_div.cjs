const fs = require('fs');
const path = '/app/applet/src/pages/AdminSettingsPage.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('</div>\n                {/* Right Column: Blur Slider & Presets */}', '{/* Right Column: Blur Slider & Presets */}');
fs.writeFileSync(path, content, 'utf8');
