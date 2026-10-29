import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

# Replace the broken UI code completely

start_idx = content.find('        <div className="bg-card border border-border rounded-xl p-5 space-y-4">\n          <h3 className="font-semibold flex items-center text-foreground">\n            <Archive className="w-5 h-5 mr-2 text-theme-500" />')
if start_idx != -1:
    new_ui = """        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold flex items-center text-foreground">
            <Archive className="w-5 h-5 mr-2 text-theme-500" />
            Import World (.zip)
          </h3>
          <p className="text-xs text-muted-foreground">
            Upload a zip containing your world. The zip can contain the world folder directly (e.g. <code>world/level.dat</code>) or the files directly (e.g. <code>level.dat</code> at root). A backup will automatically be made.
          </p>
          
          <div className="space-y-4">
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
        </div>
      </div>
      
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <div className="text-sm text-orange-500/90">
          <strong>Important:</strong> Never delete <code>session.lock</code> while the server is running. The automated import workflow will ensure the server is stopped and permissions are safely handled for you.
        </div>
      </div>
    </div>
  );
}
"""
    content = content[:start_idx] + new_ui
    with open("src/components/WorldManager.tsx", "w") as f:
        f.write(content)
