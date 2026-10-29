const fs = require('fs');
const path = 'src/server/services/docker.ts';
let code = fs.readFileSync(path, 'utf8');

const getDockerPattern = '    return new Docker({\n      protocol,\n      host,\n      port,\n      headers: {';

const getDockerReplacement = '    console.log("[getDocker] Selected Node URL: " + protocol + "://" + host + ":" + port);\n' +
'    console.log("[getDocker] Configured Node IP string was: " + node.ip + ", connectionMode: " + node.connectionMode);\n' +
'    const d = new Docker({\n      protocol,\n      host,\n      port,\n      headers: {';

code = code.replace(getDockerPattern, getDockerReplacement);

const returnDockerPattern = '      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"\n      }\n    });\n  }\n  return defaultDocker;\n};';

const returnDockerReplacement = '      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"\n      }\n    });\n' +
'    const originalDial = d.modem.dial;\n' +
'    d.modem.dial = function(options, callback) {\n' +
'      console.log("[Docker Request] " + options.method + " " + options.path);\n' +
'      console.log("[Docker Outgoing URL] " + d.modem.protocol + "://" + d.modem.host + ":" + d.modem.port + options.path);\n' +
'      const originalCb = callback;\n' +
'      const newCb = (err, data) => {\n' +
'        if (err) {\n' +
'          console.log("[Docker Response Error] Status:", err.statusCode, "Body:", err.reason || err.message);\n' +
'        } else {\n' +
'          console.log("[Docker Response Success] Body:", JSON.stringify(data));\n' +
'        }\n' +
'        return originalCb(err, data);\n' +
'      };\n' +
'      return originalDial.call(d.modem, options, newCb);\n' +
'    };\n' +
'    return d;\n  }\n  return defaultDocker;\n};';

code = code.replace(returnDockerPattern, returnDockerReplacement);

fs.writeFileSync(path, code, 'utf8');
