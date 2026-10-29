const fs = require('fs');
let content = fs.readFileSync('src/context/SettingsContext.tsx', 'utf8');

content = content.replace(
/  const \[firebaseAppId, setFirebaseAppId\] = useState<string>\(""\);/,
`  const [firebaseAppId, setFirebaseAppId] = useState<string>("");\n  const [defaultRuntime, setDefaultRuntime] = useState<string>("docker");`
);

content = content.replace(
/      if \(res\.data\.firebaseAppId !== undefined\) setFirebaseAppId\(res\.data\.firebaseAppId\);/,
`      if (res.data.firebaseAppId !== undefined) setFirebaseAppId(res.data.firebaseAppId);\n      if (res.data.defaultRuntime !== undefined) setDefaultRuntime(res.data.defaultRuntime);`
);

content = content.replace(
/        firebaseAppId,\n        fetchSettings/,
`        firebaseAppId,\n        defaultRuntime,\n        fetchSettings`
);

fs.writeFileSync('src/context/SettingsContext.tsx', content);
