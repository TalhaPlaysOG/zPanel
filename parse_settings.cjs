const fs = require('fs');
const content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const returnIdx = content.indexOf('return (');
console.log("Return starts at:", returnIdx);

const preReturn = content.substring(0, returnIdx);
const returnBlock = content.substring(returnIdx);

fs.writeFileSync('settings_pre.txt', preReturn);
fs.writeFileSync('settings_return.txt', returnBlock);
