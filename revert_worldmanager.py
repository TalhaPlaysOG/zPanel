import re

with open("src/components/WorldManager.tsx", "r") as f:
    content = f.read()

# Revert states
content = re.sub(r'  const \[analyzeStatus, setAnalyzeStatus\] = useState<any>\(null\);\n  const \[isAnalyzing, setIsAnalyzing\] = useState\(false\);\n', '', content, flags=re.DOTALL)

# Revert handleImport
old_handleImport = """
  const handleImport = async () => {
    if (!uploadFile) return;
    if (server.status === "running" || server.status === "starting") {
      showToast("Please stop the server before importing a world.", "error");
      return;
    }

    setIsImporting(true);
    try {
      // 1. Upload zip
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("path", uploadFile.name);
      await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2. Trigger import logic
      await axios.post(`/api/servers/${serverId}/world/import`, {
        zipPath: uploadFile.name,
        levelName: worldInfo?.levelName || "world",
      });

      showToast("World imported successfully! A backup of the old world was created.", "success");
      setUploadFile(null);
      fetchWorldInfo();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setIsImporting(false);
    }
  };
"""
content = re.sub(r'  const handleImport = async \(\) => \{.*?\n  \};\n\n  const cancelImport = \(\) => \{.*?\n  \};\n', old_handleImport, content, flags=re.DOTALL)

# Revert UI
old_ui = """
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
"""
content = re.sub(r'          <div className="space-y-4">.*?</div>\n        </div>', old_ui + '        </div>', content, flags=re.DOTALL)

with open("src/components/WorldManager.tsx", "w") as f:
    f.write(content)
