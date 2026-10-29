const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 'temp-admin', role: 'admin' }, "jtg-panel-super-secret");
  console.log('Starting server...');
  try {
    const res = await axios.post(
      'http://localhost:3000/api/servers/ad80acd7-9f5a-4ad9-93c6-e679f55d4a57/start',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Response:', res.data);
  } catch(e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}
test();
