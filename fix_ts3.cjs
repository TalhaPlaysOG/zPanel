const fs = require('fs');
let code = fs.readFileSync('src/server/services/docker.ts', 'utf8');

code = code.replace(
  'd.modem.dial = function(options, callback) {',
  'd.modem.dial = function(options: any, callback: any) {'
);

code = code.replace(
  'const newCb = (err, data) => {',
  'const newCb = (err: any, data: any) => {'
);

code = code.replace(
  'const parseImage = (img) => {',
  'const parseImage = (img: string) => {'
);

code = code.replace(
  'const checkImage = async (tag) => {',
  'const checkImage = async (tag: string) => {'
);

code = code.replace(
  "stream.on('data', (chunk) => {",
  "stream.on('data', (chunk: any) => {"
);
code = code.replace(
  "stream.on('data', (chunk) => {",
  "stream.on('data', (chunk: any) => {"
);
code = code.replace(
  "stream.on('data', (chunk) => {",
  "stream.on('data', (chunk: any) => {"
);

fs.writeFileSync('src/server/services/docker.ts', code);
