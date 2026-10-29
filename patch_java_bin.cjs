const fs = require('fs');
let content = fs.readFileSync('src/server/services/local.ts', 'utf8');

content = content.replace(
/const javaBin = process.env.JAVA_BIN \|\| "java";/,
`const javaBin = process.env.JAVA_BIN || "/usr/bin/java";`
);

fs.writeFileSync('src/server/services/local.ts', content);
