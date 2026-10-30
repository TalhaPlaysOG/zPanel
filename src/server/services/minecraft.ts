export const getJavaVersionForMinecraft = (version: string, software: string) => {
  const v = (version || "").toLowerCase();
  const s = (software || "").toLowerCase();

  // Java 25: Minecraft 1.22+ (future releases) and cutting-edge snapshots
  if (v.startsWith("1.22") || v.startsWith("1.23") || v.includes("snapshot")) {
    return "25";
  }
  // Java 21: Minecraft 1.20.5+ and 1.21 series
  if (v.startsWith("1.21") || v.startsWith("1.20.6") || v.startsWith("1.20.5")) {
    return "21";
  }
  // Java 17: Minecraft 1.18 - 1.20.4
  if (v.startsWith("1.18") || v.startsWith("1.19") || v.startsWith("1.20")) {
    return "17";
  }
  // Java 16: Minecraft 1.17
  if (v.startsWith("1.17")) {
    return "16";
  }
  // Java 11: Minecraft 1.16 and older
  return "11";
};

export const getDockerImageForJava = (javaVersion: string) => {
  if (javaVersion === "25") return "ghcr.io/pterodactyl/yolks:java_25";
  if (javaVersion === "21") return "ghcr.io/pterodactyl/yolks:java_21";
  if (javaVersion === "17") return "ghcr.io/pterodactyl/yolks:java_17";
  if (javaVersion === "16") return "ghcr.io/pterodactyl/yolks:java_16";
  if (javaVersion === "11") return "ghcr.io/pterodactyl/yolks:java_11";
  if (javaVersion === "8") return "ghcr.io/pterodactyl/yolks:java_8";
  return "ghcr.io/pterodactyl/yolks:java_21";
};

export const getStartupCommand = (software: string, memory: number, jarName: string) => {
  return `java -Xms128M -Xmx${memory}G -jar ${jarName} --nogui`;
};
