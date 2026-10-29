const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

content = content.replace(
/  const validateStep = \(\) => \{\n    if \(currentStep === 0 && !state\.name\.trim\(\)\) \{\n      setNameError\(true\);\n      return false;\n    \}\n    if \(currentStep === 1\) \{\n      if \(!state\.port \|\| state\.port <= 0 \|\| state\.port > 65535\) \{\n        alert\("Please enter a valid Server Port \(1-65535\)\."\);\n        return false;\n      \}\n    \}\n    return true;\n  \};/g,
`  const [isCheckingPort, setIsCheckingPort] = useState(false);
  const validateStep = async () => {
    if (currentStep === 0 && !state.name.trim()) {
      setNameError(true);
      return false;
    }
    if (currentStep === 1) {
      if (!state.port || state.port <= 0 || state.port > 65535) {
        alert("Please enter a valid Server Port (1-65535).");
        return false;
      }
      setIsCheckingPort(true);
      try {
        const res = await axios.get(\`/api/servers/check-port?port=\${state.port}\`);
        setIsCheckingPort(false);
        if (res.data.inUse) {
          alert("Port is already in use by another server.");
          return false;
        }
      } catch (err) {
        setIsCheckingPort(false);
        alert("Failed to check port availability.");
        return false;
      }
    }
    return true;
  };`
);

content = content.replace(
/  const handleNext = \(\) => \{\n    if \(!validateStep\(\)\) return;\n    if \(currentStep < STEPS\.length - 1\) \{\n      showStep\(currentStep \+ 1\);\n    \} else \{\n      launch\(\);\n    \}\n  \};/g,
`  const handleNext = async () => {
    const isValid = await validateStep();
    if (!isValid) return;
    if (currentStep < STEPS.length - 1) {
      showStep(currentStep + 1);
    } else {
      launch();
    }
  };`
);

// update the NEXT button to show loading
content = content.replace(
/<span>\{currentStep === STEPS\.length - 1 \? \(deployed \? 'DEPLOYED' : 'LAUNCH'\) : 'NEXT'\}<\/span>\n                \{currentStep === STEPS\.length - 1 \? <Rocket className="w-4 h-4" \/> : <ArrowLeft className="w-4 h-4 rotate-180" \/>\}/g,
`<span>{isCheckingPort ? 'CHECKING...' : currentStep === STEPS.length - 1 ? (deployed ? 'DEPLOYED' : 'LAUNCH') : 'NEXT'}</span>
                {isCheckingPort ? null : currentStep === STEPS.length - 1 ? <Rocket className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}`
);

content = content.replace(
/disabled=\{deployed \|\| deployProgress > 0\}/g,
`disabled={deployed || deployProgress > 0 || isCheckingPort}`
);


fs.writeFileSync('src/pages/CreateServer.tsx', content);
