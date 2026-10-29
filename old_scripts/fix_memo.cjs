const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(
  "const mappedServers = realServers.map((s, i) => {",
  "const mappedServers = useMemo(() => realServers.map((s, i) => {"
);
code = code.replace(
  "    };\n  });",
  "    };\n  }), [realServers]);"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log("Fixed useMemo for servers");
