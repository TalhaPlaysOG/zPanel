const fs = require('fs');
let code = fs.readFileSync('src/components/WorldManager.tsx', 'utf8');

code = code.replace(
  'showToast(String(Please stop the server before importing a world.), "error")',
  'showToast("Please stop the server before importing a world.", "error")'
);

code = code.replace(
  'showToast(String(err.message), "error")',
  'showToast(err.message, "error")'
);

code = code.replace(
  'showToast(String(err.response?.data?.error || err.message), "error")',
  'showToast(err.response?.data?.error || err.message, "error")'
);

code = code.replace(
  'showToast(String(World imported successfully! A backup of the old world was created.), "success")',
  'showToast("World imported successfully! A backup of the old world was created.", "success")'
);

fs.writeFileSync('src/components/WorldManager.tsx', code);
