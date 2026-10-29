const fs = require('fs');
let code = fs.readFileSync('src/server/services/sftp.ts', 'utf8');
code = code.replace(
  'const SFTP_PORT = 6868;',
  'const SFTP_PORT = process.env.NODE_ENV === "production" ? 6868 : 6869;'
);
fs.writeFileSync('src/server/services/sftp.ts', code);
