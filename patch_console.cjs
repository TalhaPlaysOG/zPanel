const fs = require('fs');
let content = fs.readFileSync('src/components/ServerConsole.tsx', 'utf8');

// Replace the socket.io config to be more robust
content = content.replace(
/    const socket: Socket = io\(\{[\s\S]*?reconnectionDelay: 2000,\n    \}\);/m,
`    const socket: Socket = io({
      auth: { token },
      // Remove transports override to allow default polling -> websocket upgrade
      // which is more stable behind proxies like Cloud Run / AI Studio.
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
    });`
);

// Add clear reconnect messages
content = content.replace(
/    socket\.on\("disconnect", \(r: string\) => \{[\s\S]*?\}\);/m,
`    socket.on("disconnect", (reason: string) => {
      setConnected(false);
      setLogs((p) => [...p, \`[System] Disconnected. Reason: \${reason}\`]);
    });
    
    socket.on("io server disconnect", () => {
      // the disconnection was initiated by the server, you need to reconnect manually
      socket.connect();
    });

    socket.on("reconnect_attempt", (attempt: number) => {
      setLogs((p) => [...p, \`[System] Attempting to reconnect (Attempt \${attempt})...\`]);
    });`
);

fs.writeFileSync('src/components/ServerConsole.tsx', content);
