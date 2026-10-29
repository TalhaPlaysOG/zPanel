import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

old_ui = """
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">World Zip File</label>
              <input 
                type="file" 
                accept=".zip" 
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-theme-500/10 file:text-theme-500 hover:file:bg-theme-500/20 transition-all text-foreground"
              />
            </div>
            <button
              onClick={handleImport}
              disabled={!uploadFile || isImporting}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-theme-600 hover:bg-theme-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isImporting ? "Importing..." : "Import World"}
            </button>
          </div>
"""

content = re.sub(r'            <div>\n              <label className="block text-sm font-medium mb-1 text-foreground">World Zip File.*?</div>\n', old_ui, content, flags=re.DOTALL)

with open("src/components/WorldManager.tsx", "w") as f:
    f.write(content)
