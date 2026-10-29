import axios from 'axios';
async function test() {
  try {
    const url = "https://api.papermc.io/v2/projects/paper/versions/1.21.1/builds";
    const res = await axios.get(url);
    console.log("Found builds:", res.data.builds.length);
    const builds = res.data.builds;
    const latestBuild = builds[builds.length - 1];
    const jarName = latestBuild.downloads.application.name;
    const jarUrl = `https://api.papermc.io/v2/projects/paper/versions/1.21.1/builds/${latestBuild.build}/downloads/${jarName}`;
    console.log("JAR URL:", jarUrl);
  } catch (e) {
    console.error(e.message);
  }
}
test();
