#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STANDALONE = path.join(ROOT, ".next", "standalone");
const SERVER = path.join(STANDALONE, "server.js");
const SEED_DB = path.join(ROOT, "prisma", "dev.db");
const TIMEOUT_MS = 60_000;

function fail(message, details = "") {
  console.error(`[verify-standalone] ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

function findSymlinks(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      found.push(full);
    } else if (entry.isDirectory()) {
      findSymlinks(full, found);
    }
  }
  return found;
}

function pickPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        server.close(() => resolve(address.port));
      } else {
        reject(new Error("Could not allocate port"));
      }
    });
  });
}

function sqliteFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function assertStandaloneRequire(packageName) {
  const requireFromServer = createRequire(SERVER);
  let resolved;
  try {
    resolved = requireFromServer.resolve(packageName);
  } catch (err) {
    fail(
      `standalone cannot resolve ${packageName}`,
      err instanceof Error ? err.stack ?? err.message : String(err),
    );
  }
  const relative = path.relative(STANDALONE, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(
      `${packageName} resolves outside .next/standalone`,
      `${packageName} -> ${resolved}`,
    );
  }
}

function assertTurbopackExternalPackages() {
  const traceNodeModules = path.join(STANDALONE, ".next", "node_modules");
  if (!fs.existsSync(traceNodeModules)) return;
  for (const entry of fs.readdirSync(traceNodeModules, { withFileTypes: true })) {
    if (entry.name.startsWith("@") && entry.isDirectory()) {
      const scopeDir = path.join(traceNodeModules, entry.name);
      for (const scoped of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        const full = path.join(scopeDir, scoped.name);
        if (scoped.isDirectory() && !fs.existsSync(path.join(full, "package.json"))) {
          fail(`Turbopack external is missing package.json: ${full}`);
        }
        const nativeBindings = findNativeBindings(full);
        if (nativeBindings.length > 0) {
          fail(
            `Turbopack external contains duplicate native binding: ${full}`,
            nativeBindings.join("\n"),
          );
        }
      }
    } else if (
      entry.isDirectory() &&
      /-[a-f0-9]{8,}$/.test(entry.name) &&
      !fs.existsSync(path.join(traceNodeModules, entry.name, "package.json"))
    ) {
      fail(
        `Turbopack external is missing package.json: ${path.join(
          traceNodeModules,
          entry.name,
        )}`,
      );
    } else if (entry.isDirectory() && /-[a-f0-9]{8,}$/.test(entry.name)) {
      const full = path.join(traceNodeModules, entry.name);
      const nativeBindings = findNativeBindings(full);
      if (nativeBindings.length > 0) {
        fail(
          `Turbopack external contains duplicate native binding: ${full}`,
          nativeBindings.join("\n"),
        );
      }
    }
  }
}

function findNativeBindings(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findNativeBindings(full, found);
    } else if (entry.name.endsWith(".node")) {
      found.push(full);
    }
  }
  return found;
}

function tail(chunks) {
  return chunks.join("").slice(-4000);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExit(child, isExited, timeoutMs = 5_000) {
  if (isExited()) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeTempDir(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await wait(250);
    }
  }
}

async function waitForRoute(url, route, started, stdoutChunks, stderrChunks) {
  let lastError = "";
  while (Date.now() - started < TIMEOUT_MS) {
    try {
      const res = await fetch(`${url}${route}`, { redirect: "manual" });
      const body = await res.text();
      if (res.status === 200) return;
      lastError = `GET ${route} returned ${res.status}\n${body.slice(0, 1000)}`;
      if (res.status >= 500) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(
    `standalone server did not return 200 for ${route}`,
    `${lastError}\n\n--- stdout tail ---\n${tail(stdoutChunks)}\n\n--- stderr tail ---\n${tail(stderrChunks)}`,
  );
}

if (!fs.existsSync(SERVER)) {
  fail(`server.js not found at ${SERVER}. Run pnpm build first.`);
}

if (!fs.existsSync(SEED_DB)) {
  fail(`seed database not found at ${SEED_DB}`);
}

const symlinks = findSymlinks(STANDALONE);
if (symlinks.length > 0) {
  fail(
    `${symlinks.length} symlink(s) remain under .next/standalone`,
    symlinks.slice(0, 20).join("\n"),
  );
}

assertStandaloneRequire("better-sqlite3");
assertStandaloneRequire("@prisma/client");
assertTurbopackExternalPackages();

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-os-standalone-"));
const tempDb = path.join(tempDir, "dev.db");
fs.copyFileSync(SEED_DB, tempDb);

const port = await pickPort();
const url = `http://127.0.0.1:${port}`;
const stdoutChunks = [];
const stderrChunks = [];
const child = spawn(process.execPath, [SERVER], {
  cwd: STANDALONE,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: sqliteFileUrl(tempDb),
    LIFE_OS_API_TOKEN: "verify-standalone-token",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => stdoutChunks.push(chunk.toString()));
child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString()));

let exited = false;
child.on("exit", (code, signal) => {
  exited = true;
  stderrChunks.push(`\n[exit] code=${code} signal=${signal}\n`);
});

try {
  const started = Date.now();
  for (const route of ["/today", "/settings", "/habits"]) {
    await waitForRoute(url, route, started, stdoutChunks, stderrChunks);
  }
  if (exited) {
    fail("standalone server exited during smoke test", tail(stderrChunks));
  }
  console.log(`[verify-standalone] OK: /today, /settings, and /habits returned 200`);
} finally {
  if (!exited && !child.killed) child.kill();
  await waitForExit(child, () => exited);
  await removeTempDir(tempDir);
}
