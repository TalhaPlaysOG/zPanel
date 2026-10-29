const fs = require('fs');
let content = fs.readFileSync('src/pages/Nodes.tsx', 'utf8');

const oldWarning = `<strong className="font-semibold text-amber-400">Beta Testing Notice:</strong> Multi-node cluster feature & external VPS node setup (direct IP or Cloudflare Tunnels) are currently in <strong>Beta Testing</strong>. For the best stability, use the <strong>Local Node</strong> (built-in).`;

const newWarning = `<strong className="font-semibold text-amber-400">Beta System Notice:</strong> The remote node system is currently in Beta. Please configure remote nodes carefully.
          <ul className="list-disc pl-5 mt-1 space-y-1 text-amber-200/90 text-xs">
            <li><strong>Cloudflare Tunnel Mode</strong> is the recommended path for remote nodes to avoid exposing ports directly.</li>
            <li><strong>Direct Host Mode</strong> is for advanced/manual setups only and requires secure firewalls.</li>
          </ul>`;

content = content.replace(oldWarning, newWarning);
fs.writeFileSync('src/pages/Nodes.tsx', content);
