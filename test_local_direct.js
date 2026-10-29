import { createLocalServer, startLocalServer } from './src/server/services/local.js';

async function test() {
  console.log("Creating local server...");
  const id = "test-server-id";
  const serverData = {
    id: id,
    port: 25577,
    type: "paper",
    version: "latest",
    ram: 1
  };
  const res = await createLocalServer(serverData);
  console.log("Created:", res);
}
test().catch(console.error);
