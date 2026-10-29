const fs = require('fs');
let content = fs.readFileSync('src/server/services/local.ts', 'utf8');

content = content.replace(
/child\.on\("error", \(err\) => \{[\s\S]*?\}\);/m,
`child.on("error", (err) => {
    logMessage(\`Failed to start server process: \${err.message}\`);
    if (err.message.includes("ENOENT")) {
        logMessage("---- BETA WARNING ----");
        logMessage("Java 21 is missing or not in PATH!");
        logMessage("Local Process is a BETA feature intended for VPS environments.");
        logMessage("If you are in a sandbox (like AI Studio), this is expected to fail.");
        logMessage("Please install Java 21, or use the stable Docker Container runtime instead.");
        logMessage("You can install Java automatically when using the panel's install.sh on a VPS.");
        logMessage("----------------------");
    }
  });`
);

fs.writeFileSync('src/server/services/local.ts', content);
