const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'temp-admin', role: 'admin' }, "jtg-panel-super-secret");
console.log(token);
