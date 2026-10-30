import fs from "fs-extra";
import path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import os from "os";
import { getJavaVersionForMinecraft } from "./minecraft.js";

const execAsync = promisify(exec);

/**
 * Java runtime management service.
 *
 * Detects, validates, and selects Java runtimes for Minecraft server processes.
 * Replaces the previous ad-hoc `resolveJavaBinary()` in local.ts which only
 * looked for "java" on PATH and could not verify the actual Java major version.
 *
 * All filesystem and process operations are async and non-blocking. Results
 * are cached with a TTL so repeated detection does not rescan the system.
 */

export interface JavaRuntime {
  path: string;
  version: string;        // major version as string: "21", "25", "17", "8"
  fullVersion: string;    // full version string: "21.0.5", "25-ea+11"
  vendor: string;         // "OpenJDK", "Eclipse Adoptium", etc.
  valid: boolean;         // executable exists and `java -version` succeeded
  source: "env" | "java-home" | "candidate" | "path";
}

export interface JavaInstallStatus {
  installed: boolean;
  versions: JavaRuntime[];
  recommendedVersion: string | null;
  missing: boolean;
  error: string | null;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let javaCache: { runtimes: JavaRuntime[]; timestamp: number } | null = null;

const isWin = process.platform === "win32";

/** Common Java executable locations, ordered from most to least preferred. */
const JAVA_CANDIDATES: string[] = isWin
  ? [
      "C:\\Program Files\\Java\\jdk-25\\bin\\java.exe",
      "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
      "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe",
      "C:\\Program Files\\Java\\jdk-11\\bin\\java.exe",
      "C:\\Program Files\\Eclipse Adoptium\\jdk-25\\bin\\java.exe",
      "C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\java.exe",
      "C:\\Program Files\\Eclipse Adoptium\\jdk-17\\bin\\java.exe",
      "C:\\Program Files\\Eclipse Adoptium\\jdk-11\\bin\\java.exe",
    ]
  : [
      "/usr/lib/jvm/java-25-openjdk*/bin/java",
      "/usr/lib/jvm/jdk-25/bin/java",
      "/usr/local/lib/jvm/jdk-25/bin/java",
      "/opt/java/openjdk-25/bin/java",
      "/usr/lib/jvm/java-21-openjdk*/bin/java",
      "/usr/lib/jvm/jdk-21/bin/java",
      "/usr/local/lib/jvm/jdk-21/bin/java",
      "/opt/java/openjdk-21/bin/java",
      "/usr/lib/jvm/java-17-openjdk*/bin/java",
      "/usr/lib/jvm/jdk-17/bin/java",
      "/usr/local/lib/jvm/jdk-17/bin/java",
      "/opt/java/openjdk-17/bin/java",
      "/usr/lib/jvm/java-11-openjdk*/bin/java",
      "/usr/lib/jvm/jdk-11/bin/java",
      "/usr/local/lib/jvm/jdk-11/bin/java",
      "/opt/java/openjdk-11/bin/java",
      "/usr/bin/java",
      "/usr/local/bin/java",
      "/opt/java/openjdk/bin/java",
      "/usr/lib/jvm/default-java/bin/java",
    ];

/** Minimum major Java version required for modern Minecraft releases. */
const MINIMUM_JAVA_VERSION = 8;

/**
 * Run `java -version` on a given executable and parse the result.
 * Returns null if the binary cannot be executed or parsed.
 */
const probeJavaVersion = async (
  javaPath: string,
  source: JavaRuntime["source"]
): Promise<JavaRuntime | null> => {
  try {
    const stat = await fs.stat(javaPath);
    if (!stat.isFile()) return null;
    if (!isWin && !(stat.mode & 0o111)) return null; // not executable
  } catch {
    return null;
  }

  let stdout = "";
  let stderr = "";
  try {
    const res = await execAsync(`"${javaPath}" -version`, {
      timeout: 10000,
      shell: true,
    } as any);
    stdout = String(res.stdout);
    stderr = String(res.stderr);
  } catch {
    // `java -version` prints to stderr on many JDKs; try capturing only stderr.
    try {
      const res2 = await execAsync(`"${javaPath}" -version 2>&1`, {
        timeout: 10000,
        shell: true,
      } as any);
      stderr = String(res2.stderr);
    } catch {
      return null;
    }
  }

  const output = stdout || stderr;
  if (!output) return null;

  // Parse version strings like:
  //   openjdk version "21.0.5" 2024-10-15
  //   java version "1.8.0_411"
  //   openjdk version "25-ea+11" 2026-XX-XX
  const versionMatch = output.match(/"([^"]+)"/);
  const rawVersion = versionMatch ? versionMatch[1] : "";
  if (!rawVersion) return null;

  let major = "";
  // Handle "1.8.0_411" style (Java 8)
  const legacyMatch = rawVersion.match(/^1\.(\d+)/);
  if (legacyMatch) {
    major = legacyMatch[1];
  } else {
    // Modern style: "21.0.5", "25-ea+11", "17.0.12"
    const modernMatch = rawVersion.match(/^(\d+)/);
    if (modernMatch) major = modernMatch[1];
  }

  if (!major || Number(major) < MINIMUM_JAVA_VERSION) return null;

  // Extract vendor
  let vendor = "Unknown";
  const vendorMatch = output.match(/(OpenJDK|Eclipse Adoptium|AdoptOpenJDK|Oracle|Amazon|Corretto|Zulu|Microsoft|Red Hat|IBM)/i);
  if (vendorMatch) vendor = vendorMatch[1];

  return {
    path: javaPath,
    version: major,
    fullVersion: rawVersion,
    vendor,
    valid: true,
    source,
  };
};

/** Expand glob-style candidate paths (e.g. /usr/lib/jvm/java-25-openjdk-star/bin/java). */
const expandCandidates = async (candidates: string[]): Promise<string[]> => {
  const expanded: string[] = [];
  for (const candidate of candidates) {
    if (candidate.includes("*")) {
      try {
        const matches = await fs.readdir(path.dirname(candidate));
        const basenamePattern = path.basename(candidate);
        // Convert glob to simple prefix match for common JVM layouts
        const prefix = basenamePattern.replace(/\*.*$/, "");
        for (const m of matches) {
          if (m.startsWith(prefix)) {
            expanded.push(path.join(path.dirname(candidate), m, "bin", "java"));
          }
        }
      } catch {
        /* ignore unreadable directories */
      }
    } else {
      expanded.push(candidate);
    }
  }
  return expanded;
};

/** Collect PATH-based Java locations. */
const getPathJavaCandidates = async (): Promise<string[]> => {
  const pathEnv = process.env.PATH || "";
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);
  const found: string[] = [];
  const exeName = isWin ? "java.exe" : "java";
  for (const dir of dirs) {
    try {
      const full = path.join(dir, exeName);
      if (await fs.pathExists(full)) found.push(full);
    } catch {
      /* ignore */
    }
  }
  return found;
};

/** Collect JAVA_HOME-based Java location. */
const getJavaHomeCandidate = (): string | null => {
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) return null;
  const exe = isWin ? path.join(javaHome, "bin", "java.exe") : path.join(javaHome, "bin", "java");
  return exe;
};

/**
 * Detect all available Java runtimes on the system.
 * Results are cached for CACHE_TTL to avoid repeated scanning.
 */
export const detectJavaRuntimes = async (forceRefresh = false): Promise<JavaRuntime[]> => {
  const now = Date.now();
  if (!forceRefresh && javaCache && now - javaCache.timestamp < CACHE_TTL) {
    return javaCache.runtimes;
  }

  const runtimes: JavaRuntime[] = [];
  const seen = new Set<string>();

  const add = async (javaPath: string, source: JavaRuntime["source"]) => {
    const normalized = path.resolve(javaPath);
    if (seen.has(normalized)) return;
    const probed = await probeJavaVersion(normalized, source);
    if (probed) {
      seen.add(normalized);
      runtimes.push(probed);
    }
  };

  // 1. JAVA_HOME (highest priority - explicit admin choice)
  const javaHome = getJavaHomeCandidate();
  if (javaHome) await add(javaHome, "java-home");

  // 2. JAVA_BIN env var
  if (process.env.JAVA_BIN) await add(process.env.JAVA_BIN, "env");

  // 3. Expanded candidate paths
  const expanded = await expandCandidates(JAVA_CANDIDATES);
  for (const candidate of expanded) await add(candidate, "candidate");

  // 4. PATH lookup (fallback)
  const pathCandidates = await getPathJavaCandidates();
  for (const candidate of pathCandidates) await add(candidate, "path");

  // Prefer higher major versions, then prefer explicit sources over PATH
  runtimes.sort((a, b) => {
    const aVer = Number(a.version);
    const bVer = Number(b.version);
    if (bVer !== aVer) return bVer - aVer;
    const srcOrder: Record<string, number> = { env: 0, "java-home": 1, candidate: 2, path: 3 };
    return (srcOrder[a.source] ?? 99) - (srcOrder[b.source] ?? 99);
  });

  javaCache = { runtimes, timestamp: now };
  return runtimes;
};

/**
 * Resolve the best Java executable for a required major version.
 * If requiredVersion is omitted, returns the highest available version.
 * Returns null if no compatible Java runtime is found.
 */
export const resolveJavaBinary = async (requiredVersion?: string): Promise<string | null> => {
  const runtimes = await detectJavaRuntimes();

  if (requiredVersion) {
    // Exact match first
    const exact = runtimes.find((r) => r.version === requiredVersion);
    if (exact) return exact.path;
    // Fall back to a higher major version (backward compatible)
    const higher = runtimes.find((r) => Number(r.version) >= Number(requiredVersion));
    if (higher) return higher.path;
    return null;
  }

  return runtimes.length > 0 ? runtimes[0].path : null;
};

/**
 * Get the Java major version for a given executable path.
 * Returns null if the binary cannot be probed.
 */
export const getJavaVersion = async (javaPath: string): Promise<{ version: string; fullVersion: string; vendor: string } | null> => {
  const runtimes = await detectJavaRuntimes(true);
  const match = runtimes.find((r) => path.resolve(r.path) === path.resolve(javaPath));
  if (!match) return null;
  return { version: match.version, fullVersion: match.fullVersion, vendor: match.vendor };
};

/**
 * Validate that a Java executable exists, is executable, and meets a required version.
 */
export const validateJavaRuntime = async (
  javaPath: string,
  requiredVersion?: string
): Promise<{ valid: boolean; version?: string; error?: string }> => {
  try {
    const stat = await fs.stat(javaPath);
    if (!stat.isFile()) {
      return { valid: false, error: `Java executable is not a file: ${javaPath}` };
    }
    if (!isWin && !(stat.mode & 0o111)) {
      return { valid: false, error: `Java executable is not executable: ${javaPath}` };
    }
  } catch {
    return { valid: false, error: `Java executable not found: ${javaPath}` };
  }

  const probed = await probeJavaVersion(javaPath, "candidate");
  if (!probed) {
    return { valid: false, error: `Java executable cannot be run: ${javaPath}` };
  }

  if (requiredVersion) {
    const required = Number(requiredVersion);
    const actual = Number(probed.version);
    if (actual < required) {
      return {
        valid: false,
        version: probed.version,
        error: `Java ${probed.version} is installed but this server requires Java ${required} or higher.`,
      };
    }
  }

  return { valid: true, version: probed.version };
};

/**
 * Get the current Java installation status for the system.
 */
export const getJavaInstallStatus = async (): Promise<JavaInstallStatus> => {
  const runtimes = await detectJavaRuntimes(true);
  const versions = runtimes.map((r) => r.version);
  const uniqueVersions = [...new Set(versions)];

  let recommended: string | null = null;
  if (uniqueVersions.includes("25")) recommended = "25";
  else if (uniqueVersions.includes("21")) recommended = "21";
  else if (uniqueVersions.includes("17")) recommended = "17";
  else if (uniqueVersions.includes("11")) recommended = "11";
  else if (runtimes.length > 0) recommended = runtimes[0].version;

  return {
    installed: runtimes.length > 0,
    versions: runtimes,
    recommendedVersion: recommended,
    missing: runtimes.length === 0,
    error: runtimes.length === 0 ? "No Java runtime detected on this system." : null,
  };
};

/**
 * Clear the Java detection cache (call after installing a new runtime).
 */
export const clearJavaCache = () => {
  javaCache = null;
};

/**
 * Attempt to install a Java runtime using the system package manager.
 * Returns { success, error, command } describing the result.
 * This is best-effort: if the package manager is unavailable or the
 * package is not found, it returns an error with the suggested command.
 */
export const installJava = async (version: string): Promise<{ success: boolean; error?: string; command?: string }> => {
  const platform = process.platform;
  const isWin = platform === "win32";

  if (isWin) {
    return {
      success: false,
      error: "Automatic Java installation is not supported on Windows. Please install Java manually.",
      command: "Download and install Java from https://adoptium.net/",
    };
  }

  // Detect package manager
  let pkgMgr: "apt" | "dnf" | "yum" | "apk" | null = null;
  try {
    await execAsync("command -v apt-get");
    pkgMgr = "apt";
  } catch {
    try {
      await execAsync("command -v dnf");
      pkgMgr = "dnf";
    } catch {
      try {
        await execAsync("command -v yum");
        pkgMgr = "yum";
      } catch {
        try {
          await execAsync("command -v apk");
          pkgMgr = "apk";
        } catch {
          pkgMgr = null;
        }
      }
    }
  }

  if (!pkgMgr) {
    return {
      success: false,
      error: "No supported package manager found (apt, dnf, yum, apk).",
      command: `Download and install Java ${version} manually from https://adoptium.net/`,
    };
  }

  // Map Java version to package name
  let packageName: string;
  if (pkgMgr === "apt") {
    if (version === "25") {
      // Java 25 may not be in default repos yet; try openjdk-25 or fall back to 21
      packageName = "openjdk-25-jre-headless";
    } else if (version === "21") {
      packageName = "openjdk-21-jre-headless";
    } else if (version === "17") {
      packageName = "openjdk-17-jre-headless";
    } else if (version === "11") {
      packageName = "openjdk-11-jre-headless";
    } else {
      packageName = `openjdk-${version}-jre-headless`;
    }
  } else if (pkgMgr === "dnf" || pkgMgr === "yum") {
    packageName = `java-${version}-openjdk-headless`;
  } else if (pkgMgr === "apk") {
    packageName = `openjdk${version}`;
  } else {
    packageName = `openjdk-${version}-jre-headless`;
  }

  const updateCmd = pkgMgr === "apt" ? "apt-get update -y" : `${pkgMgr} makecache -y`;
  const installCmd = `${updateCmd} && ${pkgMgr} install -y ${packageName}`;

  try {
    await execAsync(updateCmd, { timeout: 60000 });
    await execAsync(`${pkgMgr} install -y ${packageName}`, { timeout: 120000 });
    clearJavaCache();
    return { success: true, command: installCmd };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      command: installCmd,
    };
  }
};

/**
 * Determine the Java version required for a Minecraft version/software.
 * Delegates to minecraft.ts.
 */
export const getRequiredJavaVersion = (minecraftVersion: string, software: string): string => {
  return getJavaVersionForMinecraft(minecraftVersion, software);
};

export default {
  detectJavaRuntimes,
  resolveJavaBinary,
  getJavaVersion,
  validateJavaRuntime,
  getJavaInstallStatus,
  clearJavaCache,
  getRequiredJavaVersion,
  installJava,
};
