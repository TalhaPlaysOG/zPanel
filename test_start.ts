import { startLocalServer, getLocalServerLogs } from './src/server/services/local.js';
import { panelEvents } from './src/server/events.js';

async function test() {
  const id = "test-server-id";
  const serverData = { id: id, ram: 1 };
  
  panelEvents.on("log", (serverId, msg) => {
    console.log(`[Event -> ${serverId}] ${msg.trim()}`);
  });

  try {
    await startLocalServer(id, serverData);
    console.log("Started local server!");
    
    setTimeout(async () => {
      console.log("\n--- Checking logs ---");
      const logs = await getLocalServerLogs(id);
      console.log(logs);
      process.exit(0);
    }, 2000);
  } catch(e) {
    console.error(e);
  }
}
test();
