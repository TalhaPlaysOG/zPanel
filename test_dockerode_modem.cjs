const Docker = require('dockerode');
const d = new Docker({
  protocol: 'https',
  host: 'example.com',
  port: 443
});
const originalDial = d.modem.dial;
d.modem.dial = function(options, callback) {
  console.log("[Docker Request] " + options.method + " " + options.path);
  console.log("[Docker Outgoing URL] " + d.modem.protocol + "://" + d.modem.host + ":" + d.modem.port + options.path);
  return originalDial.call(d.modem, options, callback);
};
d.getContainer('abc').start().catch(() => {});
