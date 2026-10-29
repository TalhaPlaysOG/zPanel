import axios from 'axios';
async function run() {
  try {
    const res = await axios.post('http://localhost:6767/api/servers', {
      name: "Test Local",
      ram: 1,
      port: 25577,
      version: "latest",
      type: "paper",
      runtimeType: "local",
      owner: "admin",
      nodeId: "local"
    }, {
      headers: {
        Authorization: "Bearer ADMIN_TOKEN" // wait, auth is JWT. I can't just call it like that.
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
