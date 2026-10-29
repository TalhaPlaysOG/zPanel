const fs = require('fs');

const files = [
  'src/pages/AdminServers.tsx',
  'src/pages/Nodes.tsx',
  'src/pages/CreateServer.tsx',
  'src/pages/ApiKeysPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/ServerList.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/min-h-screen bg-ink text-white font-body\s*/g, '');
  fs.writeFileSync(file, content);
}
