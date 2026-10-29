import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

# Add states for analysis
states_to_add = """
  const [isImporting, setIsImporting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
"""
content = re.sub(r'  const \[isImporting, setIsImporting\] = useState\(false\);\n  const \[uploadFile, setUploadFile\] = useState<File \| null>\(null\);', states_to_add, content)

# Rewrite handleImport
handle_import = """
  const handleImport = async () => {
    if (!uploadFile) return;
    if (server.status === "running" || server.status === "starting") {
      showToast("Please stop the server before importing a world.", "error");
      return;
    }
    
    // If not analyzed yet, let's analyze
    if (!analyzeStatus) {
        setIsAnalyzing(true);
        try {
          const formData = new FormData();
          formData.append("file", uploadFile);
          formData.append("path", uploadFile.name);
          await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const res = await axios.post(`/api/servers/${serverId}/world/analyze`, {
            zipPath: uploadFile.name
          });
          setAnalyzeStatus(res.data);
          
          if (res.data.status === "invalid") {
             showToast("Invalid archive: level.dat not found.", "error");
          }
        } catch(e: any) {
          showToast(e.response?.data?.error || e.message, "error");
        } finally {
          setIsAnalyzing(false);
        }
        return;
    }

    // Now proceed with actual import
    setIsImporting(true);
    try {
      const res = await axios.post(`/api/servers/${serverId}/world/import`, {
        zipPath: uploadFile.name,
        levelName: worldInfo?.levelName || "world",
      });

      showToast("World imported successfully! A backup of the old world was created.", "success");
      setUploadFile(null);
      setAnalyzeStatus(null);
      fetchWorldInfo();
      
      if (res.data.permissions) {
          alert(`Permissions updated. UID: ${res.data.permissions.uidDetected}, Read: ${res.data.permissions.read}, Write: ${res.data.permissions.write}`);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setIsImporting(false);
    }
  };
  
  const cancelImport = () => {
     setAnalyzeStatus(null);
     setUploadFile(null);
  };
"""

content = re.sub(r'  const handleImport = async \(\) => \{.*?\n  \};\n', handle_import, content, flags=re.DOTALL)

ui_logic = """
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input 
               type="file" 
               accept=".zip" 
               onChange={e => { setUploadFile(e.target.files?.[0] || null); setAnalyzeStatus(null); }}
               disabled={isImporting || isAnalyzing}
               className="flex-1 bg-card border border-border text-foreground px-4 py-2 rounded-xl"
            />
            {!analyzeStatus ? (
                <button 
                  onClick={handleImport}
                  disabled={!uploadFile || isImporting || isAnalyzing}
                  className="px-6 py-2 bg-theme-600/10 hover:bg-theme-600/20 text-theme-500 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center"
                >
                  <Upload className="w-4 h-4 mr-2" /> {isAnalyzing ? "Analyzing..." : "Analyze & Import"}
                </button>
            ) : (
                <div className="flex gap-2">
                    <button 
                      onClick={handleImport}
                      disabled={isImporting || analyzeStatus.status === 'invalid'}
                      className="px-6 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-medium rounded-xl border border-green-500/20 transition-all disabled:opacity-50 flex items-center"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Import
                    </button>
                    <button 
                      onClick={cancelImport}
                      disabled={isImporting}
                      className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-xl border border-red-500/20 transition-all disabled:opacity-50 flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel
                    </button>
                </div>
            )}
          </div>
          {analyzeStatus && analyzeStatus.status === 'valid' && (
              <div className="p-4 bg-theme-600/10 border border-theme-600/20 rounded-xl mb-4 text-theme-500 text-sm">
                  <p><strong>World detected successfully!</strong></p>
                  <p>Detected DataVersion: {analyzeStatus.worldDataVersion || "Unknown"}</p>
                  {analyzeStatus.worldDataVersion > (worldInfo?.dataVersion || 0) && (
                      <p className="text-orange-500 mt-2 font-bold">⚠️ Warning: The imported world appears to be newer than the current server version. This may cause corruption.</p>
                  )}
                  <p className="mt-2 text-muted-foreground">Are you sure you want to proceed? A full backup will be created first.</p>
              </div>
          )}
"""

content = re.sub(r'          <div className="flex flex-col sm:flex-row gap-4 mb-4">\n            <input .*?<\/button>\n          <\/div>', ui_logic, content, flags=re.DOTALL)

with open("src/components/WorldManager.tsx", "w") as f:
    f.write(content)
