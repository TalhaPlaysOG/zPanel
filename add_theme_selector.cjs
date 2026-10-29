const fs = require('fs');
const path = '/app/applet/src/pages/AdminSettingsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const themeSelector = `
                  {/* Theme Selector */}
                  <div className="pt-6 border-t border-border-subtle mt-6">
                    <label className="block text-sm font-medium text-muted-foreground mb-3">Accent Color Theme</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: "red", color: "#ef4444" },
                        { name: "blue", color: "#3b82f6" },
                        { name: "orange", color: "#f97316" },
                        { name: "green", color: "#10b981" },
                        { name: "white", color: "#e4e4e7" }
                      ].map(t => (
                        <button
                          key={t.name}
                          onClick={async () => {
                            try {
                              setTheme(t.name);
                              document.documentElement.setAttribute('data-theme', t.name);
                              await axios.put("/api/system/settings", { theme: t.name });
                            } catch(e) {}
                          }}
                          className={\`w-10 h-10 rounded-full flex items-center justify-center transition-all \${theme === t.name ? 'ring-2 ring-offset-2 ring-offset-card ring-theme-500 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}\`}
                          style={{ backgroundColor: t.color }}
                          title={t.name.charAt(0).toUpperCase() + t.name.slice(1)}
                        >
                           {theme === t.name && <Check size={16} className={t.name === 'white' ? 'text-zinc-900' : 'text-white'} />}
                        </button>
                      ))}
                    </div>
                  </div>
`;

const insertTarget = `{/* Right Column: Blur Slider & Presets */}`;

if (content.includes(insertTarget)) {
    content = content.replace(insertTarget, themeSelector + '\n                </div>\n                ' + insertTarget);
    
    // Add Check to imports if not present
    if (content.includes('lucide-react')) {
       // regex to add Check if it's missing
       if (!/import.*?\bCheck\b.*?from 'lucide-react'/.test(content)) {
           content = content.replace(/from 'lucide-react';/, ', Check } from \'lucide-react\';').replace(/} ,/, ',');
       }
    }
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('Added theme selector successfully');
} else {
    console.log('Insert target not found');
}
