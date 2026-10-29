const fs = require('fs');
let content = fs.readFileSync('src/pages/Nodes.tsx', 'utf8');

content = content.replace(
  /<div className="flex items-center gap-2 text-sm text-muted-foreground">\s*<div className=\{\`h-2 w-2 rounded-full \$\\{node\.status === 'online' \? 'bg-emerald-500' : 'bg-amber-500'\\}\`\} \/>\s*<span className="capitalize">\{node\.status\}<\/span>\s*<\/div>/g,
  `<div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className={\`h-2 w-2 rounded-full \${node.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}\`} />
                  <span className="capitalize">
                    {node.status}
                    {node.status === 'offline' && node.offlineReason ? \` - \${node.offlineReason}\` : ''}
                  </span>
                </div>`
);

fs.writeFileSync('src/pages/Nodes.tsx', content);
