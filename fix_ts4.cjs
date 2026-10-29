const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');

code = code.replace(
  'd.modem.protocol',
  '(d.modem as any).protocol'
);
code = code.replace(
  'd.modem.host',
  '(d.modem as any).host'
);
code = code.replace(
  'd.modem.port',
  '(d.modem as any).port'
);

fs.writeFileSync('src/server/services/docker.ts', code);
