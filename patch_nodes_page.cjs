const fs = require('fs');
let content = fs.readFileSync('src/pages/Nodes.tsx', 'utf8');

// Add connectionMode to formData
content = content.replace(
  /const \[formData, setFormData\] = useState\(\{ name: "", ip: "", port: "", key: "" \}\);/g,
  `const [formData, setFormData] = useState({ name: "", ip: "", port: "", key: "", connectionMode: "tunnel" });`
);

// Reset form data on success
content = content.replace(
  /setFormData\(\{ name: "", ip: "", port: "", key: "" \}\);/g,
  `setFormData({ name: "", ip: "", port: "", key: "", connectionMode: "tunnel" });`
);

// Handle form submit
content = content.replace(
  /let \{ name, ip, port, key \} = formData;\s*\/\/ Auto-detect domain and format as https if no protocol is given\s*if \(ip && !ip\.startsWith\("http:\/\/"\) && !ip\.startsWith\("https:\/\/"\) && ip\.match\(\/\[a-zA-Z\]\/\) && !ip\.match\(\/\^\[0-9\.\]\+\$\/\)\) \{\s*ip = "https:\/\/" \+ ip;\s*\}/g,
  `let { name, ip, port, key, connectionMode } = formData;
    if (connectionMode === "tunnel") {
      port = "";
      if (ip && !ip.startsWith("http://") && !ip.startsWith("https://")) {
         ip = "https://" + ip;
      }
    } else {
      if (ip && !ip.startsWith("http://") && !ip.startsWith("https://") && ip.match(/[a-zA-Z]/) && !ip.match(/^[0-9.]+$/)) {
         ip = "https://" + ip;
      }
    }`
);

// Include connectionMode in the post payload
content = content.replace(
  /await axios\.post\("\/api\/nodes", \{ name, ip, port, key \}\);/g,
  `await axios.post("/api/nodes", { name, ip, port, key, connectionMode });`
);

// Update UI
const modalContent = `              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 flex items-center justify-between rounded-xl border border-border bg-background p-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="connectionMode"
                        checked={formData.connectionMode === "tunnel"}
                        onChange={() => setFormData({...formData, connectionMode: "tunnel"})}
                        className="text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Tunnel / Domain Mode</span>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="mb-2 flex items-center justify-between rounded-xl border border-border bg-background p-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio"
                        name="connectionMode" 
                        checked={formData.connectionMode === "direct"}
                        onChange={() => setFormData({...formData, connectionMode: "direct"})}
                        className="text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Direct Host Mode</span>
                    </div>
                  </label>
                </div>
              </div>

              {formData.connectionMode === "tunnel" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Public Domain / URL</label>
                  <input
                    required
                    type="text"
                    value={formData.ip}
                    onChange={e => setFormData({...formData, ip: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="tunnel.yourdomain.com"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    We will use this URL directly. No port is required because the tunnel maps to the internal port automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Host / IP</label>
                    <input
                      required
                      type="text"
                      value={formData.ip}
                      onChange={e => setFormData({...formData, ip: e.target.value})}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Port</label>
                    <input
                      required
                      type="text"
                      value={formData.port}
                      onChange={e => setFormData({...formData, port: e.target.value})}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. 6768"
                    />
                  </div>
                </div>
              )}`;

content = content.replace(
  /<div className="grid grid-cols-3 gap-4">[\s\S]*?<\/div>\s*<\/div>/,
  modalContent
);

// Add Beta guardrails
content = content.replace(
  /<h1 className="text-2xl font-bold text-foreground">Nodes<\/h1>/,
  `<div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Nodes</h1>
            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-md border border-amber-500/20">BETA</span>
          </div>`
);

content = content.replace(
  /<p className="text-muted-foreground mt-1">\s*Manage daemon nodes where your game servers will run\.\s*<\/p>/,
  `<p className="text-muted-foreground mt-1">
            Manage daemon nodes where your game servers will run. The remote node system is currently in Beta.
          </p>`
);

fs.writeFileSync('src/pages/Nodes.tsx', content);
