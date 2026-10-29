const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

const replacement = `server: {
      host: "0.0.0.0",
      allowedHosts: ["panel.gtk.qzz.io"],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: { usePolling: true },
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["panel.gtk.qzz.io"],
    },`;

code = code.replace(/server: \{\s*\/\/ HMR is disabled[\s\S]*?usePolling: true \},\s*\}/, replacement);
fs.writeFileSync('vite.config.ts', code);
