const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

content = content.replace(
/  const validateStep = \(\) => \{\n    if \(currentStep === 0 && !state\.name\.trim\(\)\) \{\n      setNameError\(true\);\n      return false;\n    \}\n    return true;\n  \};/g,
`  const validateStep = () => {
    if (currentStep === 0 && !state.name.trim()) {
      setNameError(true);
      return false;
    }
    if (currentStep === 1) {
      if (!state.port || state.port <= 0 || state.port > 65535) {
        alert("Please enter a valid Server Port (1-65535).");
        return false;
      }
    }
    return true;
  };`
);

fs.writeFileSync('src/pages/CreateServer.tsx', content);
