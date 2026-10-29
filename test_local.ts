import { createLocalServer, startLocalServer, getLocalServerLogs } from './src/server/services/local.js';
import { panelEvents } from './src/server/events.js';

async function test() {
  const id = "test-server-id";
  const serverData = { id: id, ram: 1, type: "paper", version: "1.21.1", port: 25580 };
  
  panelEvents.on("log", (serverId, msg) => {
    console.log(`[Event -> ${serverId}] ${msg.trim()}`);
  });

  try {
    console.log("Creating local server...");
    await createLocalServer(serverData);
    console.log("Starting local server...");
    await startLocalServer(id, serverData);
    console.log("Started local server!");
    
    setTimeout(async () => {
      console.log("\n--- Checking logs ---");
      const logs = await getLocalServerLogs(id);
      console.log(logs);
      process.exit(0);
    }, 15000);
  } catch(e) {
    console.error(e);
  }
}
test();
