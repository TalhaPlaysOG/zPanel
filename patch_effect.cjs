const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// Fix useEffect dependencies and setter
content = content.replace(
/    setFbAppId\(firebaseAppId \|\| ""\);\n    setCustomBgUrlInput\(panelBackgroundImage \|\| ""\);\n  \}, \[/g,
`    setFbAppId(firebaseAppId || "");\n    setCustomBgUrlInput(panelBackgroundImage || "");\n    setNewDefaultRuntime(defaultRuntime || 'docker');\n  }, [defaultRuntime, `
);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
