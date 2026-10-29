const fs = require('fs');
let code = fs.readFileSync('src/components/WorldManager.tsx', 'utf8');

code = code.replace(
  '<span className="font-medium text-foreground">{serverVersion}</span>',
  '<span className="font-medium text-foreground">{serverVersion}</span>\n            </div>\n            <div className="flex justify-between border-b border-border/50 pb-2">\n              <span className="text-muted-foreground">Action</span>\n              <a href={`/servers/${serverId}/settings`} className="text-theme-500 hover:underline">Change Server Version</a>'
);

fs.writeFileSync('src/components/WorldManager.tsx', code);
