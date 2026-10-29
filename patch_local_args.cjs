const fs = require('fs');
let content = fs.readFileSync('src/server/services/local.ts', 'utf8');

content = content.replace(
/const child = spawn\(javaBin, \[\`-Xms\$\{memory\}G\`, \`-Xmx\$\{memory\}G\`, "-jar", "server.jar", "nogui"\], \{/g,
`const child = spawn(javaBin, [\`-Xms\${memory}G\`, \`-Xmx\${memory}G\`, "-Djline.terminal=jline.UnsupportedTerminal", "-jar", "server.jar", "nogui", "--nojline"], {`
);

fs.writeFileSync('src/server/services/local.ts', content);
