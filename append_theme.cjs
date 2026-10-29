const fs = require('fs');
const path = '/app/applet/src/index.css';

let content = fs.readFileSync(path, 'utf8');

const themeCss = `
@theme {
  --color-theme-100: var(--theme-100);
  --color-theme-200: var(--theme-200);
  --color-theme-300: var(--theme-300);
  --color-theme-400: var(--theme-400);
  --color-theme-500: var(--theme-500);
  --color-theme-600: var(--theme-600);
  --color-theme-700: var(--theme-700);
  --color-theme-800: var(--theme-800);
  --color-theme-900: var(--theme-900);
  --color-theme-950: var(--theme-950);
}

:root, [data-theme="red"] {
  --theme-100: #fee2e2;
  --theme-200: #fecaca;
  --theme-300: #fca5a5;
  --theme-400: #f87171;
  --theme-500: #ef4444;
  --theme-600: #dc2626;
  --theme-700: #b91c1c;
  --theme-800: #991b1b;
  --theme-900: #7f1d1d;
  --theme-950: #450a0a;
  
  --theme-rgb-500: 239, 68, 68;
  --theme-rgb-600: 220, 38, 38;
}

[data-theme="blue"] {
  --theme-100: #dbeafe;
  --theme-200: #bfdbfe;
  --theme-300: #93c5fd;
  --theme-400: #60a5fa;
  --theme-500: #3b82f6;
  --theme-600: #2563eb;
  --theme-700: #1d4ed8;
  --theme-800: #1e40af;
  --theme-900: #1e3a8a;
  --theme-950: #172554;
  
  --theme-rgb-500: 59, 130, 246;
  --theme-rgb-600: 37, 99, 235;
}

[data-theme="orange"] {
  --theme-100: #ffedd5;
  --theme-200: #fed7aa;
  --theme-300: #fdba74;
  --theme-400: #fb923c;
  --theme-500: #f97316;
  --theme-600: #ea580c;
  --theme-700: #c2410c;
  --theme-800: #9a3412;
  --theme-900: #7c2d12;
  --theme-950: #431407;
  
  --theme-rgb-500: 249, 115, 22;
  --theme-rgb-600: 234, 88, 12;
}

[data-theme="white"] {
  --theme-100: #f4f4f5;
  --theme-200: #e4e4e7;
  --theme-300: #d4d4d8;
  --theme-400: #a1a1aa;
  --theme-500: #71717a;
  --theme-600: #52525b;
  --theme-700: #3f3f46;
  --theme-800: #27272a;
  --theme-900: #18181b;
  --theme-950: #09090b;
  
  --theme-rgb-500: 113, 113, 122;
  --theme-rgb-600: 82, 82, 91;
}

[data-theme="green"] {
  --theme-100: #d1fae5;
  --theme-200: #a7f3d0;
  --theme-300: #6ee7b7;
  --theme-400: #34d399;
  --theme-500: #10b981;
  --theme-600: #059669;
  --theme-700: #047857;
  --theme-800: #065f46;
  --theme-900: #064e3b;
  --theme-950: #022c22;
  
  --theme-rgb-500: 16, 185, 129;
  --theme-rgb-600: 5, 150, 105;
}
`;

content = content + themeCss;
fs.writeFileSync(path, content, 'utf8');
console.log('Appended theme CSS');
