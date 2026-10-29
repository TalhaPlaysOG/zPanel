const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(
  'className="bg-ink text-white font-body min-h-full relative selection:bg-white selection:text-black"',
  'className="text-white font-body min-h-full relative selection:bg-white selection:text-black"'
);
content = content.replace(
  '<div className="border-b border-line bg-black overflow-hidden flex">',
  '<div className="border-b border-line bg-panel overflow-hidden flex">'
);
content = content.replace(
  '<footer className="border-t border-line bg-black">',
  '<footer className="border-t border-line bg-panel/30">'
);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
