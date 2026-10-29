const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(
    "const handleScroll = () => {\n        const p = document.documentElement.scrollTop / (document.documentElement.scrollHeight - innerHeight);\n        const el = document.getElementById('scroll-progress');\n        if (el) el.style.transform = `scaleX(${Math.min(p, 1)})`;\n    };\n    window.addEventListener('scroll', handleScroll, { passive: true });\n    return () => window.removeEventListener('scroll', handleScroll);",
    "const mainEl = document.querySelector('main');\n    if (!mainEl) return;\n    const handleScroll = () => {\n        const p = mainEl.scrollTop / (mainEl.scrollHeight - mainEl.clientHeight);\n        const el = document.getElementById('scroll-progress');\n        if (el) el.style.transform = `scaleX(${Math.min(p, 1)})`;\n    };\n    mainEl.addEventListener('scroll', handleScroll, { passive: true });\n    return () => mainEl.removeEventListener('scroll', handleScroll);"
);

// We should also replace the IntersectionObserver's root to `document.querySelector('main')` for better detection
code = code.replace(
    "const io = new IntersectionObserver(entries => {",
    "const mainEl = document.querySelector('main');\n    const io = new IntersectionObserver(entries => {"
);
code = code.replace(
    "{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }",
    "{ root: mainEl, threshold: 0.15, rootMargin: '0px 0px -40px 0px' }"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log("Fixed scroll logic");
