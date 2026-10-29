const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

content = content.replace(
/      alert\("Failed to deploy container"\);\n    \}/g,
`      alert(e.response?.data?.error || "Failed to deploy container");
    }`
);

fs.writeFileSync('src/pages/CreateServer.tsx', content);
