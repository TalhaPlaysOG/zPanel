const fs = require('fs');
let content = fs.readFileSync('src/pages/PlayitTunnel.tsx', 'utf8');

// Add serverRuntimeType state
content = content.replace(
/  const \[isProcessing, setIsProcessing\] = useState\(false\);/g,
`  const [isProcessing, setIsProcessing] = useState(false);
  const [serverRuntimeType, setServerRuntimeType] = useState<string>("docker");`
);

// Fetch server data
content = content.replace(
/      const res = await axios\.get\(\`\/api\/servers\/\$\{serverId\}\/playit\`\);/g,
`      const serverRes = await axios.get(\`/api/servers/\${serverId}\`);
      setServerRuntimeType(serverRes.data.runtimeType || "docker");
      const res = await axios.get(\`/api/servers/\${serverId}/playit\`);`
);

// Add Beta guardrail for Local Process
content = content.replace(
/        <div className="bg-muted-subtle border border-border-subtle rounded-xl p-6 shadow-sm">/g,
`        {serverRuntimeType === 'local' ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-amber-500 font-bold mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5" /> Local Process Playit (Beta / Coming Soon)
            </h3>
            <p className="text-amber-500/80 text-sm">
              Playit / Play Tunnel integration for Local Process servers is currently in Beta and temporarily disabled. 
              The host-side execution path is still under development to ensure it safely routes traffic directly to the host process rather than a Docker container.
            </p>
          </div>
        ) : null}
        <div className={\`bg-muted-subtle border border-border-subtle rounded-xl p-6 shadow-sm \${serverRuntimeType === 'local' ? 'opacity-50 pointer-events-none' : ''}\`}>`
);

fs.writeFileSync('src/pages/PlayitTunnel.tsx', content);
