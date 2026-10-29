const axios = require('axios');
axios.post('http://localhost:3000/api/servers/dummy/start').catch(e => console.error(e.message));
