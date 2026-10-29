import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

ui_logic = """
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">World Zip File</label>
              <input 
                type="file" 
                accept=".zip" 
                onChange={(e) => { setUploadFile(e.target.files ? e.target.files[0] : null); setAnalyzeStatus(null); }}
                disabled={isImporting || isAnalyzing}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-theme-500/10 file:text-theme-500 hover:file:bg-theme-500/20 transition-all text-foreground"
              />
            </div>
            {!analyzeStatus ? (
                <button 
                  onClick={handleImport}
                  disabled={!uploadFile || isImporting || isAnalyzing}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-theme-600 hover:bg-theme-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" /> {isAnalyzing ? "Analyzing..." : "Analyze & Import World"}
                </button>
            ) : (
                <div className="flex gap-2">
                    <button 
                      onClick={handleImport}
                      disabled={isImporting || analyzeStatus.status === 'invalid'}
                      className="flex-1 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-medium rounded-xl border border-green-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Import
                    </button>
                    <button 
                      onClick={cancelImport}
                      disabled={isImporting}
                      className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-xl border border-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel
                    </button>
                </div>
            )}
            {analyzeStatus && analyzeStatus.status === 'valid' && (
              <div className="p-4 bg-theme-600/10 border border-theme-600/20 rounded-xl mt-4 text-theme-500 text-sm">
                  <p><strong>World detected successfully!</strong></p>
                  <p>Detected DataVersion: {analyzeStatus.worldDataVersion || "Unknown"}</p>
                  {analyzeStatus.worldDataVersion > (worldInfo?.dataVersion || 0) && (
                      <p className="text-orange-500 mt-2 font-bold">⚠️ Warning: The imported world appears to be newer than the current server version. This may cause corruption.</p>
                  )}
                  <p className="mt-2 text-muted-foreground">Are you sure you want to proceed? A full backup will be created first.</p>
              </div>
            )}
          </div>
"""

content = re.sub(r'          <div className="space-y-4">.*?</div>\n        </div>', ui_logic + '\n        </div>', content, flags=re.DOTALL)

with open("src/components/WorldManager.tsx", "w") as f:
    f.write(content)
