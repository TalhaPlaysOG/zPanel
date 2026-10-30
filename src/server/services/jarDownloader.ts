import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { open as openFile } from "fs/promises";
import axios from "axios";

/**
 * Server JAR downloader.
 *
 * Responsibilities:
 *  - Resolve the correct download source for every server software the panel
 *    supports (Paper, Purpur, Vanilla, Spigot, Fabric, Forge, Velocity,
 *    BungeeCord, Waterfall).
 *  - Download to a temporary file, validate it is a real (non-empty, ZIP based)
 *    JAR, then atomically move it into place.
 *  - Report progress so the UI/console can show what is happening.
 *  - Never overwrite a valid existing JAR (callers check first, and this
 *    module refuses to replace a valid file unless explicitly forced).
 */

export interface JarDownloadProgress {
  stage: "resolving" | "downloading" | "verifying" | "installing" | "done" | "error";
  message: string;
  percent?: number;
  source?: string;
}

export type JarProgressCallback = (progress: JarDownloadProgress) => void;

export interface JarDownloadResult {
  type: string;
  version: string;
  source: string;
  size: number;
  path: string;
}

const DEFAULT_HEADERS = {
  "User-Agent": "zPanel/1.0 (+https://github.com/TalhaPlaysOG/zPanel)",
  Accept: "*/*",
};

const MIN_JAR_BYTES = 32 * 1024; // Real server jars are always much larger.
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export const MINECRAFT_SERVER_TYPES = new Set([
  "paper",
  "purpur",
  "vanilla",
  "spigot",
  "fabric",
  "forge",
  "neoforge",
  "quilt",
  "bungeecord",
  "waterfall",
  "velocity",
]);

const GENERIC_TYPES = new Set(["nodejs", "node", "python", "python3"]);

export const normalizeType = (type?: string) => (type ? type.toLowerCase().trim() : "");

export const isMinecraftType = (type?: string) => {
  const t = normalizeType(type);
  if (!t) return false;
  if (GENERIC_TYPES.has(t)) return false;
  return true;
};

export const jarFileNameFor = (serverData: any): string => {
  const configured = String(serverData?.serverJar || "server.jar").trim();
  const base = path.basename(configured);
  return base.toLowerCase().endsWith(".jar") ? base : "server.jar";
};

/** A server jar must exist, be non-trivial in size and start with the ZIP magic. */
export const isValidJarFile = async (filePath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size < MIN_JAR_BYTES) return false;
    const handle = await openFile(filePath, "r");
    try {
      const buffer = Buffer.alloc(4);
      const { bytesRead } = await handle.read(buffer, 0, 4, 0);
      if (bytesRead < 4) return false;
      const magic = buffer.readUInt32BE(0);
      // Local file header (PK\x03\x04) or empty archive (PK\x05\x06)
      return magic === 0x504b0304 || magic === 0x504b0506;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
};

const axiosGet = async (url: string, timeout = 30000) => {
  return axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
  });
};

const normalizeVersion = (version?: string) => {
  const v = (version || "latest").trim();
  if (!v || v === "default") return "latest";
  return v;
};

const assertVersionLooksSane = (version: string) => {
  if (version === "latest") return;
  // Allow release versions and snapshot style versions used by proxies.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(version)) {
    throw new Error(
      `Invalid Minecraft version "${version}". Choose a version from the panel's version list.`
    );
  }
};

interface Candidate {
  url: string;
  source: string;
  version: string;
  sha256?: string;
  sha1?: string;
  size?: number;
  /** Forge needs an installer run instead of a plain server jar. */
  forgeInstaller?: boolean;
  forgeVersion?: string;
}

/* ------------------------------------------------------------------ */
/*  PaperMC (Paper / Velocity / Waterfall)                             */
/* ------------------------------------------------------------------ */

const PAPER_API = "https://fill.papermc.io/v3/projects";

const fetchPaperProject = async (project: string) => {
  const res = await axiosGet(`${PAPER_API}/${project}`);
  return res.data;
};

const resolvePaperVersion = async (project: string, version: string) => {
  const data = await fetchPaperProject(project);
  const versions: Record<string, string[]> = data?.versions || {};
  if (version === "latest") {
    const firstKey = Object.keys(versions)[0];
    if (!firstKey) throw new Error(`No ${project} versions are published.`);
    return versions[firstKey]?.[0] || firstKey;
  }
  // Accept either a family key ("1.21") or an exact version ("1.21.11").
  if (versions[version]?.length) return versions[version][0];
  for (const list of Object.values(versions)) {
    if (list.includes(version)) return version;
  }
  throw new Error(
    `Minecraft version "${version}" is not available for ${project}. ` +
      `Choose a supported version in server settings.`
  );
};

const paperCandidates = async (project: string, version: string): Promise<Candidate[]> => {
  const resolved = await resolvePaperVersion(project, version);
  const buildsRes = await axiosGet(`${PAPER_API}/${project}/versions/${encodeURIComponent(resolved)}/builds`);
  const builds = Array.isArray(buildsRes.data) ? buildsRes.data : [];
  const build = builds.find((b: any) => b?.downloads?.["server:default"]?.url) || builds[0];
  const download = build?.downloads?.["server:default"];
  if (!download?.url) {
    throw new Error(`No downloadable ${project} build found for ${resolved}.`);
  }
  return [
    {
      url: download.url,
      source: `PaperMC (${project} ${resolved} build ${build.id})`,
      version: resolved,
      sha256: download.checksums?.sha256,
      size: download.size,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Purpur                                                             */
/* ------------------------------------------------------------------ */

const PURPUR_API = "https://api.purpurmc.org/v2/purpur";

const resolvePurpurVersion = async (version: string) => {
  if (version !== "latest") return version;
  const res = await axiosGet(PURPUR_API);
  const versions: string[] = res.data?.versions || [];
  const current = res.data?.metadata?.current;
  if (current) return current;
  if (!versions.length) throw new Error("No Purpur versions are published.");
  return versions[versions.length - 1];
};

const purpurCandidates = async (version: string): Promise<Candidate[]> => {
  const resolved = await resolvePurpurVersion(version);
  const meta = await axiosGet(`${PURPUR_API}/${encodeURIComponent(resolved)}`);
  const build = meta.data?.builds?.latest;
  if (!build) throw new Error(`Purpur has no build for version ${resolved}.`);
  return [
    {
      url: `${PURPUR_API}/${encodeURIComponent(resolved)}/${build}/download`,
      source: `PurpurMC (${resolved} build ${build})`,
      version: resolved,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Vanilla (Mojang)                                                   */
/* ------------------------------------------------------------------ */

const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

const resolveVanillaVersion = async (version: string) => {
  const res = await axiosGet(MANIFEST_URL);
  const manifest = res.data;
  if (version === "latest") return manifest?.latest?.release;
  const match = (manifest?.versions || []).find((v: any) => v.id === version);
  if (!match) throw new Error(`Vanilla Minecraft version "${version}" was not found.`);
  return match.id;
};

const vanillaCandidates = async (version: string): Promise<Candidate[]> => {
  const resolved = await resolveVanillaVersion(version);
  const manifestRes = await axiosGet(MANIFEST_URL);
  const entry = (manifestRes.data?.versions || []).find((v: any) => v.id === resolved);
  if (!entry?.url) throw new Error(`Vanilla ${resolved} metadata is unavailable.`);
  const versionRes = await axiosGet(entry.url);
  const server = versionRes.data?.downloads?.server;
  if (!server?.url) throw new Error(`Vanilla ${resolved} has no server download.`);
  return [
    {
      url: server.url,
      source: `Mojang (vanilla ${resolved})`,
      version: resolved,
      sha1: server.sha1,
      size: server.size,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Spigot (trusted mirror; Spigot has no official direct jar)          */
/* ------------------------------------------------------------------ */

const spigotCandidates = async (version: string): Promise<Candidate[]> => {
  let resolved = version;
  if (resolved === "latest") {
    resolved = await resolveVanillaVersion("latest");
  }
  return [
    {
      url: `https://download.getbukkit.org/spigot/spigot-${encodeURIComponent(resolved)}.jar`,
      source: `Bukkit/Spigot downloads (${resolved})`,
      version: resolved,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Fabric                                                             */
/* ------------------------------------------------------------------ */

const FABRIC_META = "https://meta.fabricmc.net/v2";

const fabricCandidates = async (version: string): Promise<Candidate[]> => {
  let mcVersion = version;
  if (mcVersion === "latest") {
    mcVersion = await resolveVanillaVersion("latest");
  }
  const loaderRes = await axiosGet(`${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}`);
  const loader = Array.isArray(loaderRes.data) ? loaderRes.data[0]?.loader?.version : null;
  if (!loader) throw new Error(`Fabric has no loader for Minecraft ${mcVersion}.`);

  let installer = "1.0.1";
  try {
    const installerRes = await axiosGet(`${FABRIC_META}/versions/installer`);
    if (Array.isArray(installerRes.data) && installerRes.data[0]?.version) {
      installer = installerRes.data[0].version;
    }
  } catch {
    /* keep fallback */
  }

  return [
    {
      url: `${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(
        loader
      )}/${encodeURIComponent(installer)}/server/jar`,
      source: `FabricMC (${mcVersion}, loader ${loader})`,
      version: mcVersion,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Forge (official installer)                                         */
/* ------------------------------------------------------------------ */

const FORGE_PROMOS = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const FORGE_MAVEN = "https://maven.minecraftforge.net/net/minecraftforge/forge";

const resolveForgeVersion = async (mcVersion: string) => {
  if (mcVersion === "latest") {
    mcVersion = await resolveVanillaVersion("latest");
  }
  const res = await axiosGet(FORGE_PROMOS);
  const promos: Record<string, string> = res.data?.promos || {};
  const forgeVersion = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`];
  if (!forgeVersion) {
    throw new Error(
      `Forge does not publish a build for Minecraft ${mcVersion}. ` +
        `Upload a server JAR manually or choose another software/version.`
    );
  }
  return { mcVersion, forgeVersion };
};

const forgeCandidates = async (version: string): Promise<Candidate[]> => {
  const { mcVersion, forgeVersion } = await resolveForgeVersion(version);
  const full = `${mcVersion}-${forgeVersion}`;
  return [
    {
      url: `${FORGE_MAVEN}/${full}/forge-${full}-installer.jar`,
      source: `MinecraftForge (${full} installer)`,
      version: mcVersion,
      forgeInstaller: true,
      forgeVersion,
    },
  ];
};

/* ------------------------------------------------------------------ */
/*  Proxies                                                            */
/* ------------------------------------------------------------------ */

const BUNGEECORD_URL =
  "https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar";

const proxyCandidates = async (type: string, version: string): Promise<Candidate[]> => {
  if (type === "bungeecord") {
    return [{ url: BUNGEECORD_URL, source: "BungeeCord CI", version: version === "latest" ? "latest" : version }];
  }
  if (type === "waterfall") {
    try {
      return await paperCandidates("waterfall", version);
    } catch (err: any) {
      // Waterfall was archived; BungeeCord is a compatible fallback.
      console.warn(`[JarDownloader] Waterfall download failed (${err.message}); using BungeeCord.`);
      return [{ url: BUNGEECORD_URL, source: "BungeeCord CI (Waterfall fallback)", version: "latest" }];
    }
  }
  // Velocity
  return await paperCandidates("velocity", version);
};

/* ------------------------------------------------------------------ */
/*  Resolution                                                         */
/* ------------------------------------------------------------------ */

export const resolveJarCandidates = async (type: string, version: string): Promise<Candidate[]> => {
  const t = normalizeType(type);
  const v = normalizeVersion(version);
  assertVersionLooksSane(v);

  switch (t) {
    case "paper":
      return paperCandidates("paper", v);
    case "purpur":
      return purpurCandidates(v);
    case "vanilla":
      return vanillaCandidates(v);
    case "spigot":
      return spigotCandidates(v);
    case "fabric":
      return fabricCandidates(v);
    case "forge":
    case "neoforge":
    case "quilt":
      // NeoForge/Quilt do not expose a plain server jar; use the official
      // Forge installer path where possible, otherwise fail with clear guidance.
      return forgeCandidates(v);
    case "velocity":
    case "bungeecord":
    case "waterfall":
      return proxyCandidates(t, v);
    default:
      throw new Error(
        `Unsupported server software "${type}". Upload a server JAR manually or ` +
          `select one of: Paper, Purpur, Vanilla, Spigot, Fabric, Forge, Velocity, BungeeCord, Waterfall.`
      );
  }
};

/* ------------------------------------------------------------------ */
/*  Download                                                           */
/* ------------------------------------------------------------------ */

const emit = (cb: JarProgressCallback | undefined, progress: JarDownloadProgress) => {
  try {
    cb?.(progress);
  } catch {
    /* progress callbacks must never break the download */
  }
};

const hashFile = async (filePath: string, algorithm: "sha1" | "sha256") => {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
};

const downloadToFile = async (
  candidate: Candidate,
  tempPath: string,
  onProgress?: JarProgressCallback
): Promise<void> => {
  const response = await axios({
    method: "GET",
    url: candidate.url,
    responseType: "stream",
    headers: DEFAULT_HEADERS,
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxRedirects: 5,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const total = Number(response.headers["content-length"]) || candidate.size || 0;
  let received = 0;
  let lastEmit = 0;

  await fs.ensureDir(path.dirname(tempPath));
  const writer = fs.createWriteStream(tempPath);

  response.data.on("data", (chunk: Buffer) => {
    received += chunk.length;
    const now = Date.now();
    if (now - lastEmit > 500) {
      lastEmit = now;
      const percent = total > 0 ? Math.min(99, Math.round((received / total) * 100)) : undefined;
      emit(onProgress, {
        stage: "downloading",
        message: `Downloading server JAR… ${percent !== undefined ? percent + "%" : Math.round(received / 1048576) + " MB"}`,
        percent,
        source: candidate.source,
      });
    }
  });

  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
};

const validateDownloadedFile = async (
  filePath: string,
  candidate: Candidate,
  onProgress?: JarProgressCallback
) => {
  emit(onProgress, { stage: "verifying", message: "Verifying downloaded server JAR…", source: candidate.source });

  if (!(await isValidJarFile(filePath))) {
    throw new Error("Downloaded file is not a valid JAR archive (it may be an HTML error page).");
  }

  if (candidate.sha256) {
    const actual = await hashFile(filePath, "sha256");
    if (actual.toLowerCase() !== candidate.sha256.toLowerCase()) {
      throw new Error("Downloaded JAR failed SHA-256 verification.");
    }
  } else if (candidate.sha1) {
    const actual = await hashFile(filePath, "sha1");
    if (actual.toLowerCase() !== candidate.sha1.toLowerCase()) {
      throw new Error("Downloaded JAR failed SHA-1 verification.");
    }
  }
};

const runForgeInstaller = async (
  installerPath: string,
  serverDir: string,
  javaBin: string,
  onProgress?: JarProgressCallback
) => {
  const { spawn } = await import("child_process");
  emit(onProgress, { stage: "installing", message: "Running the official Forge installer (this can take a few minutes)…" });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(javaBin, ["-jar", installerPath, "--installServer"], {
      cwd: serverDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.length > 20000) output = output.slice(-20000);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error("Forge installer timed out."));
    }, 10 * 60 * 1000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Unable to run Forge installer: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Forge installer exited with code ${code}.`));
    });
  });
};

export const findForgeArgsFile = async (serverDir: string): Promise<string | null> => {
  const roots = [
    path.join(serverDir, "libraries", "net", "minecraftforge", "forge"),
    path.join(serverDir, "libraries", "net", "neoforged", "forge"),
  ];
  for (const root of roots) {
    try {
      const versions = await fs.readdir(root);
      for (const ver of versions) {
        for (const name of ["win_args.txt", "unix_args.txt"]) {
          const candidate = path.join(root, ver, name);
          if (await fs.pathExists(candidate)) return candidate;
        }
      }
    } catch {
      /* keep looking */
    }
  }
  return null;
};

/**
 * Download (and validate) a server jar.
 *
 * @param type       Server software (paper, purpur, vanilla, ...).
 * @param version    Minecraft version or "latest".
 * @param destPath   Destination jar path (usually <serverDir>/server.jar).
 * @param onProgress Optional progress callback.
 */
export const downloadJar = async (
  type: string,
  version: string,
  destPath: string,
  onProgress?: JarProgressCallback
): Promise<JarDownloadResult> => {
  const t = normalizeType(type);
  const v = normalizeVersion(version);
  const serverDir = path.dirname(destPath);

  if (!isMinecraftType(t)) {
    throw new Error(`"${type}" is not a JAR based server software.`);
  }

  // Never replace a valid jar that is already in place.
  if (await isValidJarFile(destPath)) {
    const stat = await fs.stat(destPath);
    emit(onProgress, {
      stage: "done",
      message: "A valid server JAR is already present; skipping download.",
      source: "existing",
    });
    return { type: t, version: v, source: "existing", size: stat.size, path: destPath };
  }

  emit(onProgress, {
    stage: "resolving",
    message: `Resolving ${t} ${v === "latest" ? "(latest)" : v} download source…`,
  });

  let candidates: Candidate[];
  try {
    candidates = await resolveJarCandidates(t, v);
  } catch (err: any) {
    emit(onProgress, { stage: "error", message: err.message });
    throw err;
  }

  if (!candidates.length) {
    const message = `No download source found for ${t} ${v}.`;
    emit(onProgress, { stage: "error", message });
    throw new Error(message);
  }

  await fs.ensureDir(serverDir);
  const tempBase = `${destPath}.download-${process.pid}-${Date.now()}`;
  const errors: string[] = [];

  for (const candidate of candidates) {
    const tempPath = `${tempBase}-${candidates.indexOf(candidate)}`;
    try {
      emit(onProgress, {
        stage: "downloading",
        message: `Downloading from ${candidate.source}…`,
        source: candidate.source,
      });
      await downloadToFile(candidate, tempPath, onProgress);
      await validateDownloadedFile(tempPath, candidate, onProgress);

      if (candidate.forgeInstaller) {
        const javaBin = process.env.JAVA_BIN || "java";
        await runForgeInstaller(tempPath, serverDir, javaBin, onProgress);
        const argsFile = await findForgeArgsFile(serverDir);
        if (!argsFile) {
          throw new Error(
            "Forge installer completed but no launch arguments were generated. " +
              "Please upload a server JAR manually."
          );
        }
        await fs.remove(tempPath).catch(() => {});
        const stat = await fs.stat(argsFile);
        emit(onProgress, {
          stage: "done",
          message: `Forge ${candidate.forgeVersion} installed successfully.`,
          source: candidate.source,
        });
        return {
          type: t,
          version: candidate.version,
          source: candidate.source,
          size: stat.size,
          path: argsFile,
        };
      }

      emit(onProgress, { stage: "installing", message: "Installing server JAR…", source: candidate.source });
      await fs.move(tempPath, destPath, { overwrite: true });
      const stat = await fs.stat(destPath);
      emit(onProgress, {
        stage: "done",
        message: `Server JAR downloaded successfully (${(stat.size / (1024 * 1024)).toFixed(2)} MB).`,
        percent: 100,
        source: candidate.source,
      });
      return {
        type: t,
        version: candidate.version,
        source: candidate.source,
        size: stat.size,
        path: destPath,
      };
    } catch (err: any) {
      errors.push(`${candidate.source}: ${err.message}`);
      console.warn(`[JarDownloader] Candidate failed (${candidate.source}): ${err.message}`);
      await fs.remove(tempPath).catch(() => {});
    }
  }

  await fs.remove(tempBase).catch(() => {});
  const message =
    `Failed to download a server JAR for ${t} ${v}. ` +
    `Please check the server's network connection or upload server.jar manually. ` +
    `Details: ${errors.join(" | ")}`;
  emit(onProgress, { stage: "error", message });
  throw new Error(message);
};

/**
 * Ensure the required server JAR exists and is a valid archive before starting.
 * Downloads the correct server software automatically when missing or corrupt.
 * If server software or version cannot be determined, requests configuration.
 */
export const ensureServerJar = async (
  serverData: any,
  onProgress?: JarProgressCallback
): Promise<string | null> => {
  if (!serverData) throw new Error("Server configuration is missing.");

  const rawType = serverData.type;
  if (!rawType || typeof rawType !== "string" || !rawType.trim()) {
    throw new Error(
      "Server software is not configured. Please select a supported server software (Paper, Purpur, Vanilla, Spigot, Fabric, Forge, Velocity, BungeeCord, Waterfall) in Server Settings."
    );
  }

  const type = normalizeType(rawType);
  if (!isMinecraftType(type)) return null;

  if (!MINECRAFT_SERVER_TYPES.has(type)) {
    throw new Error(
      `Unsupported server software "${rawType}". Please configure a supported software (Paper, Purpur, Vanilla, Spigot, Fabric, Forge, Velocity, BungeeCord, Waterfall) in Server Settings.`
    );
  }

  const rawVersion = serverData.version;
  if (!rawVersion || typeof rawVersion !== "string" || !rawVersion.trim()) {
    throw new Error(
      "Minecraft version is not configured. Please choose a valid version in Server Settings."
    );
  }
  const version = normalizeVersion(rawVersion);

  const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);
  await fs.ensureDir(serverDir);

  if (type === "forge" || type === "neoforge" || type === "quilt") {
    const existingArgs = await findForgeArgsFile(serverDir);
    if (existingArgs) {
      emit(onProgress, {
        stage: "done",
        message: `Using existing Forge installation (${path.basename(existingArgs)}).`,
        source: "existing",
      });
      return existingArgs;
    }

    emit(onProgress, {
      stage: "resolving",
      message: `Forge launch files not found. Running official installer for ${version}…`,
    });
    const installerDest = path.join(serverDir, "server.jar");
    const result = await downloadJar(type, version, installerDest, onProgress);
    return result.path;
  }

  const jarName = jarFileNameFor(serverData);
  const jarPath = path.join(serverDir, jarName);

  if (await isValidJarFile(jarPath)) {
    emit(onProgress, {
      stage: "done",
      message: `Using existing valid server JAR: ${jarName}`,
      source: "existing",
    });
    return jarPath;
  }

  if (await fs.pathExists(jarPath)) {
    emit(onProgress, {
      stage: "resolving",
      message: `Existing ${jarName} is corrupt or incomplete. Re-downloading ${type} ${version}…`,
    });
  } else {
    emit(onProgress, {
      stage: "resolving",
      message: `Required server JAR (${jarName}) is missing. Downloading ${type} ${version}…`,
    });
  }

  const result = await downloadJar(type, version, jarPath, onProgress);
  if (!(await isValidJarFile(jarPath))) {
    throw new Error("Downloaded server JAR failed final archive validation.");
  }

  return jarPath;
};

