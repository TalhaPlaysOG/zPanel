import re

with open("src/components/ServerBackups.tsx", "r") as f:
    content = f.read()

# Add restore function
restore_func = """
  const handleRestore = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore ${filename}? This will overwrite current server data and cannot be undone.`)) return;
    try {
      setIsCreating(true); // Reusing this for loading state
      await axios.post(`/api/servers/${serverId}/backups/${filename}/restore`);
      alert("Backup restored successfully.");
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to restore backup.");
    } finally {
      setIsCreating(false);
    }
  };
"""
content = re.sub(r'  const handleDelete = async \(filename: string\) => \{', restore_func + '\n  const handleDelete = async (filename: string) => {', content)

# Add Restore icon to lucide imports
content = content.replace('Archive, Download, Trash2, RefreshCw, Plus, Clock, FileArchive', 'Archive, Download, Trash2, RefreshCw, Plus, Clock, FileArchive, RotateCcw')

# Add restore button next to download
button_html = """
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        title="Restore"
                        className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
"""
content = re.sub(r'                      <button\n                        onClick=\{\(\) => handleDownload\(backup\.filename\)\}', button_html + '                      <button\n                        onClick={() => handleDownload(backup.filename)}', content)

with open("src/components/ServerBackups.tsx", "w") as f:
    f.write(content)
