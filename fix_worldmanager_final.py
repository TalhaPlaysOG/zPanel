import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

# Make sure there is only ONE return block and the tags are balanced
start_idx = content.find('  return (')

end_content = """  return (
    <div className="p-6 max-w-4xl space-y-6">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-5 ${toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
          {toast.message}
        </div>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-foreground">World Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold flex items-center text-foreground">
            <Info className="w-5 h-5 mr-2 text-theme-500" />
            Current World Status
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Level Name</span>
              <span className="font-medium text-foreground">{worldInfo?.levelName}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Detected World Version</span>
              <span className="font-medium text-foreground">{worldVersion}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Server Version</span>
              <span className="font-medium text-foreground">{serverVersion}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Action</span>
              <a href={`/servers/${serverId}/settings`} className="text-theme-500 hover:underline">Change Server Version</a>
            </div>
            <div className="pt-2">
              <span className="text-muted-foreground block mb-1">Compatibility:</span>
              <div className={`flex items-start space-x-2 ${statusColor} bg-white/[0.02] p-3 rounded-lg border border-current/10`}>
                <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium">{compatibilityStatus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
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

if start_idx != -1:
    content = content[:start_idx] + end_content
    with open("src/components/WorldManager.tsx", "w") as f:
        f.write(content)

