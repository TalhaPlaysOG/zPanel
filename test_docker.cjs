const Docker = require('dockerode');
const d = new Docker({
  protocol: 'https',
  host: 'example.com',
  port: 443,
});
console.log(d.modem.host);
console.log(d.modem.protocol);
