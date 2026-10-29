const fs = require('fs');
let code = fs.readFileSync('src/components/WorldManager.tsx', 'utf8');

code = code.replace(
  'import { useToast } from "../hooks/use-toast";',
  ''
);

code = code.replace(
  'const { toast } = useToast();',
  'const [toast, setToast] = useState<{message: string, type: "success" | "error"} | null>(null);\n  const showToast = (message: string, type: "success" | "error" = "success") => {\n    setToast({ message, type });\n    setTimeout(() => setToast(null), 3000);\n  };'
);

code = code.replace(/toast\(\{(.+?)\}\)/g, (match, p1) => {
  if (p1.includes('destructive')) {
    let msgMatch = p1.match(/description:\s*"([^"]+)"/);
    let msg = msgMatch ? msgMatch[1] : (p1.match(/description:\s*([^,]+)/)[1] || 'Error');
    return `showToast(String(${msg}), "error")`;
  } else {
    let msgMatch = p1.match(/description:\s*"([^"]+)"/);
    let msg = msgMatch ? msgMatch[1] : 'Success';
    return `showToast(String(${msg}), "success")`;
  }
});

// Also add the Toast component UI to the render output
code = code.replace(
  '<div className="p-6 max-w-4xl space-y-6">',
  '<div className="p-6 max-w-4xl space-y-6">\n      {toast && (\n        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-5 ${toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>\n          {toast.message}\n        </div>\n      )}'
);

fs.writeFileSync('src/components/WorldManager.tsx', code);
