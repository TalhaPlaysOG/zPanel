const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

content = content.replace(
/await axios\.put\("\/api\/system\/settings", \{ defaultRuntime: 'docker' \}\);\n\s*fetchSettings\(\);/g,
`const res = await axios.put("/api/system/settings", { defaultRuntime: 'docker' });\n                          if (res.data.warning) alert(res.data.warning);\n                          fetchSettings();`
);

content = content.replace(
/await axios\.put\("\/api\/system\/settings", \{ defaultRuntime: 'local' \}\);\n\s*fetchSettings\(\);/g,
`const res = await axios.put("/api/system/settings", { defaultRuntime: 'local' });\n                            if (res.data.warning) alert(res.data.warning);\n                            fetchSettings();`
);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
