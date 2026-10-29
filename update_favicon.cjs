const fs = require('fs');
const path = 'src/context/SettingsContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "red");
  }, [theme]);`;

const replacement = `  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "red");
  }, [theme]);

  useEffect(() => {
    if (panelLogo) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = panelLogo;
    } else {
      let link = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = "/vite.svg"; // Fallback or clear
      }
    }
  }, [panelLogo]);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully added panelLogo to favicon logic');
} else {
    console.log('Target not found');
}
