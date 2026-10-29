const fs = require('fs');
let content = fs.readFileSync('src/pages/Nodes.tsx', 'utf8');

content = content.replace(
  /<p className="text-muted-foreground mt-1">\s*Manage daemon nodes where your game servers will run\. The remote node system is currently in Beta\.\s*<\/p>/,
  `<p className="text-muted-foreground mt-1">
            Manage daemon nodes where your game servers will run.
          </p>
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
            <div className="text-amber-500 text-sm flex-1">
              <strong>Beta System:</strong> Please configure remote nodes carefully.
              <ul className="list-disc pl-5 mt-1 space-y-1 text-amber-500/90 text-xs">
                <li><strong>Cloudflare Tunnel Mode</strong> is the recommended path for remote nodes to avoid exposing ports directly.</li>
                <li><strong>Direct Host Mode</strong> is for advanced/manual setups only and requires secure firewalls.</li>
              </ul>
            </div>
          </div>`
);

fs.writeFileSync('src/pages/Nodes.tsx', content);
