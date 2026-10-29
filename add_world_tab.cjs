const fs = require('fs');
let code = fs.readFileSync('src/pages/ServerView.tsx', 'utf8');

// Add import
code = code.replace(
  'import PlayitTunnel from "./PlayitTunnel";',
  'import PlayitTunnel from "./PlayitTunnel";\nimport WorldManager from "../components/WorldManager";\nimport { Map } from "lucide-react";'
);

// Add tab
code = code.replace(
  'tabs.splice(1, 0, { name: "Properties", path: `/servers/${id}/properties`, exactPath: "properties", icon: <Sliders size={18} /> });',
  'tabs.splice(1, 0, { name: "Properties", path: `/servers/${id}/properties`, exactPath: "properties", icon: <Sliders size={18} /> });\n    tabs.splice(2, 0, { name: "World", path: `/servers/${id}/world`, exactPath: "world", icon: <Map size={18} /> });'
);

// Add Route
code = code.replace(
  '<Route path="/properties" element={<ServerProperties serverId={id!} />} />',
  '<Route path="/properties" element={<ServerProperties serverId={id!} />} />\n             <Route path="/world" element={<WorldManager serverId={id!} server={server} />} />'
);

fs.writeFileSync('src/pages/ServerView.tsx', code);
