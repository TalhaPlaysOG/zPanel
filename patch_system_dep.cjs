const fs = require('fs');
let content = fs.readFileSync('src/server/routes/system.ts', 'utf8');

const depCheck = `
  let warningMessage;
  if (defaultRuntime !== undefined) {
    settings.defaultRuntime = defaultRuntime;
    if (defaultRuntime === 'local') {
      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        await execAsync(\`\${process.env.JAVA_BIN || "java"} -version\`);
      } catch (err) {
        warningMessage = "WARNING: Java was not detected on the system. Local Process runtime requires Java 21. Servers will fail to start until Java is installed (run install.sh again).";
      }
    } else if (defaultRuntime === 'docker') {
      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        await execAsync("docker --version");
      } catch (err) {
        warningMessage = "WARNING: Docker was not detected on the system. Docker runtime requires Docker engine. Servers will fail to start until Docker is installed.";
      }
    }
  }
`;

content = content.replace(
/  if \(defaultRuntime !== undefined\) settings\.defaultRuntime = defaultRuntime;/g,
depCheck
);

content = content.replace(
/  res\.json\(\{ success: true \}\);/g,
"  res.json({ success: true, warning: warningMessage });"
);

fs.writeFileSync('src/server/routes/system.ts', content);
