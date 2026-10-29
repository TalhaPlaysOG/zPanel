const fs = require('fs');

let system = fs.readFileSync('src/server/routes/system.ts', 'utf8');
system = system.replace(
/firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId/g,
"firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, defaultRuntime"
);
system = system.replace(
/  if \(firebaseAppId !== undefined\) settings\.firebaseAppId = firebaseAppId;/g,
"  if (firebaseAppId !== undefined) settings.firebaseAppId = firebaseAppId;\n  if (defaultRuntime !== undefined) settings.defaultRuntime = defaultRuntime;"
);
fs.writeFileSync('src/server/routes/system.ts', system);

let api = fs.readFileSync('src/server/routes/api.ts', 'utf8');
api = api.replace(
/    firebaseAppId: settings\.firebaseAppId \|\| ""/g,
'    firebaseAppId: settings.firebaseAppId || "",\n    defaultRuntime: settings.defaultRuntime || "docker"'
);
fs.writeFileSync('src/server/routes/api.ts', api);

