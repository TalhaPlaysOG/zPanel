/**
 * Java Runtime Management Tests for zPanel
 *
 * Tests the java.ts service: detection, version parsing, validation,
 * version selection, and error handling.
 *
 * Run with: npx tsx test-java-runtime.ts
 */

import assert from "node:assert";
import fs from "fs-extra";
import os from "os";
import path from "path";

// Test helpers - we test via the compiled module using tsx
import {
  detectJavaRuntimes,
  resolveJavaBinary,
  validateJavaRuntime,
  getJavaInstallStatus,
  clearJavaCache,
  getRequiredJavaVersion,
  installJava,
} from "./src/server/services/java.ts";
import { getJavaVersionForMinecraft } from "./src/server/services/minecraft.ts";

let passed = 0;
let failed = 0;

const assertTest = (name: string, fn: () => void | Promise<void>) => {
  return async () => {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };
};

async function main() {
  clearJavaCache();

  console.log("\n=== Java Runtime Management Tests ===\n");

  // ── Test 1: Java version parsing (minecraft.ts) ──
  await assertTest("Java 25 selected for Minecraft 1.22+", async () => {
    assert.strictEqual(getJavaVersionForMinecraft("1.22", "paper"), "25");
    assert.strictEqual(getJavaVersionForMinecraft("1.23", "paper"), "25");
    assert.strictEqual(getJavaVersionForMinecraft("1.22.1", "paper"), "25");
    assert.strictEqual(getJavaVersionForMinecraft("1.22", "forge"), "25");
  })();

  await assertTest("Java 21 selected for Minecraft 1.20.5-1.21", async () => {
    assert.strictEqual(getJavaVersionForMinecraft("1.21", "paper"), "21");
    assert.strictEqual(getJavaVersionForMinecraft("1.21.1", "paper"), "21");
    assert.strictEqual(getJavaVersionForMinecraft("1.20.5", "paper"), "21");
    assert.strictEqual(getJavaVersionForMinecraft("1.20.6", "paper"), "21");
    assert.strictEqual(getJavaVersionForMinecraft("1.20.5", "forge"), "21");
  })();

  await assertTest("Java 17 selected for Minecraft 1.18-1.20.4", async () => {
    assert.strictEqual(getJavaVersionForMinecraft("1.18", "paper"), "17");
    assert.strictEqual(getJavaVersionForMinecraft("1.19", "paper"), "17");
    assert.strictEqual(getJavaVersionForMinecraft("1.20", "paper"), "17");
    assert.strictEqual(getJavaVersionForMinecraft("1.20.4", "paper"), "17");
  })();

  await assertTest("Java 16 selected for Minecraft 1.17", async () => {
    assert.strictEqual(getJavaVersionForMinecraft("1.17", "paper"), "16");
  })();

  await assertTest("Java 11 selected for Minecraft 1.16 and older", async () => {
    assert.strictEqual(getJavaVersionForMinecraft("1.16", "paper"), "11");
    assert.strictEqual(getJavaVersionForMinecraft("1.15", "paper"), "11");
    assert.strictEqual(getJavaVersionForMinecraft("1.12", "paper"), "11");
  })();

  // ── Test 2: getRequiredJavaVersion (java.ts wrapper) ──
  await assertTest("getRequiredJavaVersion returns Java 21 for 1.21", async () => {
    assert.strictEqual(getRequiredJavaVersion("1.21", "paper"), "21");
  })();

  await assertTest("getRequiredJavaVersion returns Java 25 for 1.22", async () => {
    assert.strictEqual(getRequiredJavaVersion("1.22", "paper"), "25");
  })();

  // ── Test 3: Java installation status structure ──
  await assertTest("getJavaInstallStatus returns valid structure", async () => {
    const status = await getJavaInstallStatus();
    assert.ok(typeof status.installed === "boolean");
    assert.ok(Array.isArray(status.versions));
    assert.ok(typeof status.missing === "boolean");
    assert.ok(status.recommendedVersion === null || typeof status.recommendedVersion === "string");
  })();

  // ── Test 4: validateJavaRuntime with invalid path ──
  await assertTest("validateJavaRuntime rejects non-existent path", async () => {
    const result = await validateJavaRuntime("/nonexistent/path/to/java", "21");
    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  })();

  await assertTest("validateJavaRuntime rejects non-executable file", async () => {
    // Create a dummy non-executable file
    const tmpFile = path.join(os.tmpdir(), `zpanel-test-java-${Date.now()}`);
    await fs.writeFile(tmpFile, "not java");
    try {
      const result = await validateJavaRuntime(tmpFile, "21");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    } finally {
      await fs.remove(tmpFile).catch(() => {});
    }
  })();

  // ── Test 5: resolveJavaBinary returns null when no Java ──
  await assertTest("resolveJavaBinary returns null when no Java available", async () => {
    clearJavaCache();
    const result = await resolveJavaBinary("99");
    assert.strictEqual(result, null);
  })();

  // ── Test 6: installJava returns failure on Windows-like or unsupported ──
  await assertTest("installJava returns error for unsupported version on no pkg mgr", async () => {
    // On Windows this returns a clear error
    if (process.platform === "win32") {
      const result = await installJava("21");
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    } else {
      // On Linux, this may actually try to install; we just check it returns a structured result
      const result = await installJava("99");
      assert.ok(typeof result.success === "boolean");
      assert.ok(typeof result.command === "string");
    }
  })();

  // ── Test 7: detectJavaRuntimes returns array ──
  await assertTest("detectJavaRuntimes returns array", async () => {
    const runtimes = await detectJavaRuntimes(true);
    assert.ok(Array.isArray(runtimes));
    for (const rt of runtimes) {
      assert.ok(rt.path);
      assert.ok(rt.version);
      assert.ok(rt.fullVersion);
      assert.ok(rt.vendor);
      assert.ok(typeof rt.valid === "boolean");
      assert.ok(["env", "java-home", "candidate", "path"].includes(rt.source));
    }
  })();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
