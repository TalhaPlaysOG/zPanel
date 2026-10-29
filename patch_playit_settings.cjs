const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const newWarning = `Configure how newly created servers are executed. Changing this affects <strong>only new servers</strong>. Existing servers will keep their current runtime.
                    <span className="block mt-2 text-amber-500/90 font-mono">
                      <strong>WARNING:</strong> The selected default runtime also controls Playit / Play Tunnel execution.
                      Docker mode uses the existing Docker-based Playit setup.
                      Local Process mode must run Playit directly on the host.
                      If dependencies are missing, Playit may fail until the environment is initialized correctly.
                    </span>`;

content = content.replace(
/Configure how newly created servers are executed\. Changing this affects <strong>only new servers<\/strong>\. Existing servers will keep their current runtime\./g,
newWarning
);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
