const fs = require('fs');
let content = fs.readFileSync('src/server/services/jarDownloader.ts', 'utf8');

content = content.replace(
  /\} else \{\n    version = version === "latest" \? "1\.21\.1" : version;\n    url = \`https:\/\/api\.purpurmc\.org\/v2\/purpur\/\$\{version\}\/latest\/download\`;\n  \}/,
  `} else {
    version = version === "latest" ? "1.21.1" : version;
    url = \`https://api.papermc.io/v2/projects/paper/versions/\${version}/builds\`;
    // We will handle the actual download url in the try block
  }`
);

content = content.replace(
  /const response = await axios\(\{/,
  `if (!url.endsWith('.jar') && type !== "bungeecord" && type !== "waterfall" && type !== "velocity") {
      // It's paper API
      const buildsRes = await axios.get(url);
      const builds = buildsRes.data.builds;
      const latestBuild = builds[builds.length - 1];
      const jarName = latestBuild.downloads.application.name;
      url = \`https://api.papermc.io/v2/projects/paper/versions/\${version}/builds/\${latestBuild.build}/downloads/\${jarName}\`;
    }

    const response = await axios({`
);

content = content.replace(
  /\} else \{\n      throw err;\n    \}/,
  `} else {
      console.warn("Failed to download Paper, falling back to Purpur API.");
      const fbVersion = version === "latest" ? "1.21.1" : version;
      const fbUrl = \`https://api.purpurmc.org/v2/purpur/\${fbVersion}/latest/download\`;
      const fbResponse = await axios({
         method: 'GET',
         url: fbUrl,
         responseType: 'stream'
      });
      const writer = fs.createWriteStream(destPath);
      fbResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    }`
);

fs.writeFileSync('src/server/services/jarDownloader.ts', content);
