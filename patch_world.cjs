const fs = require('fs-extra');
const path = require('path');

async function patchWorld() {
  const file = "src/server/controllers/world.ts";
  let content = await fs.readFile(file, 'utf8');

  const new_permissions_logic = `
    // 6. Fix ownership/permissions based on existing files
    let detectedUid = process.getuid ? process.getuid() : 1000;
    let detectedGid = process.getgid ? process.getgid() : 1000;
    let permissionResults = {
       uidDetected: detectedUid,
       gidDetected: detectedGid,
       read: false,
       write: false,
       tempFileTested: false
    };

    if (isLocal) {
      // Find a reference file created by the server (e.g., server.properties or logs dir)
      const refFile = path.join(serverDir, "server.properties");
      if (fs.existsSync(refFile)) {
         const stat = await fs.stat(refFile);
         detectedUid = stat.uid;
         detectedGid = stat.gid;
         permissionResults.uidDetected = detectedUid;
         permissionResults.gidDetected = detectedGid;
      }

      if (process.getuid) {
        const chownR = async (dir: string) => {
          const files = await fs.readdir(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            await fs.chown(fullPath, detectedUid, detectedGid);
            if (stat.isDirectory()) {
              await chownR(fullPath);
            }
          }
        };
        await fs.chown(currentWorldPath, detectedUid, detectedGid);
        await chownR(currentWorldPath);
        
        // Verify read/write permission
        try {
           await fs.access(currentWorldPath, fs.constants.R_OK);
           permissionResults.read = true;
           await fs.access(currentWorldPath, fs.constants.W_OK);
           permissionResults.write = true;
           
           // Test temp file
           const tempFile = path.join(currentWorldPath, "jtg_test_permission.tmp");
           await fs.writeFile(tempFile, "test");
           await fs.chown(tempFile, detectedUid, detectedGid);
           await fs.remove(tempFile);
           permissionResults.tempFileTested = true;
        } catch(e) {
           console.error("Permission test failed:", e);
        }
      }
    }
    
    res.json({ success: true, message: "World imported successfully!", permissions: permissionResults });
`;

  content = content.replace(/    \/\/ 6\. Fix ownership\/permissions[\s\S]*?res\.json\(\{ success: true, message: "World imported successfully!" \}\);/, new_permissions_logic);
  await fs.writeFile(file, content);
}

patchWorld();
