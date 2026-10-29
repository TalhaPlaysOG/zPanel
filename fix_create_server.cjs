const fs = require('fs');
let content = fs.readFileSync('src/pages/CreateServer.tsx', 'utf8');

// Remove the duplicated useSettings hooks
content = content.replace(/  const \{ defaultRuntime \} = useSettings\(\);\n  useEffect\(\(\) => \{\n    if \(defaultRuntime\) \{\n      updateState\('runtimeType', defaultRuntime\);\n    \}\n  \}, \[defaultRuntime\]\);\n/g, "");

// Inject useSettings at the beginning of the component
content = content.replace(
/export default function CreateServer\(\) \{/g,
"import { useSettings } from '../context/SettingsContext';\n\nexport default function CreateServer() {\n  const { defaultRuntime } = useSettings();"
);

// Inject effect to initialize runtimeType
content = content.replace(
/  const \[state, setState\] = useState\(\{([\s\S]*?)ip: '', port: 25565, runtimeType: 'docker',([\s\S]*?)\}\);/g,
`  const [state, setState] = useState({$1ip: '', port: 25565, runtimeType: 'docker',$2});\n\n  useEffect(() => {\n    if (defaultRuntime) {\n      setState(s => ({ ...s, runtimeType: defaultRuntime }));\n    }\n  }, [defaultRuntime]);`
);

fs.writeFileSync('src/pages/CreateServer.tsx', content);
