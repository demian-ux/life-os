#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const electronExe = path.resolve(process.argv[2] ?? "");
const standaloneDir = path.resolve(process.argv[3] ?? "");
const server = path.join(standaloneDir, "server.js");
const seedDb = path.resolve("prisma", "dev.db");
const token = "verify-electron-standalone-token";
const timeoutMs = 60_000;

function fail(message, details = "") {
  console.error(`[verify-electron-standalone] ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

if (!fs.existsSync(electronExe)) fail(`Electron executable not found: ${electronExe}`);
if (!fs.existsSync(server)) fail(`standalone server not found: ${server}`);
if (!fs.existsSync(seedDb)) fail(`seed database not found: ${seedDb}`);

function sqliteFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function tail(chunks) {
  return chunks.join("").slice(-4000);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickPort() {
  const net = await import("node:net");
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

async function waitForRoute(url, route, opts, stdoutChunks, stderrChunks) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}${route}`, opts);
      const body = await res.text();
      if (res.status === 200 && !body.includes("ERR_DLOPEN_FAILED")) return;
      lastError = `GET ${route} returned ${res.status}\n${body.slice(0, 1000)}`;
      if (res.status >= 500 || body.includes("ERR_DLOPEN_FAILED")) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await wait(500);
  }
  fail(
    `Electron standalone did not return a healthy 200 for ${route}`,
    `${lastError}\n\n--- stdout tail ---\n${tail(stdoutChunks)}\n\n--- stderr tail ---\n${tail(stderrChunks)}`,
  );
}

async function waitForExit(child, isExited, timeout = 5_000) {
  if (isExited()) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-os-electron-"));
const tempDb = path.join(tempDir, "dev.db");
fs.copyFileSync(seedDb, tempDb);

const port = await pickPort();
const url = `http://127.0.0.1:${port}`;
const stdoutChunks = [];
const stderrChunks = [];
let exited = false;

const runtimeName = path.basename(electronExe).toLowerCase();
const needsElectronRunAsNode = !runtimeName.startsWith("node");

const child = spawn(electronExe, [server], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    ...(needsElectronRunAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: sqliteFileUrl(tempDb),
    LIFE_OS_API_TOKEN: token,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => stdoutChunks.push(chunk.toString()));
child.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString()));
child.on("exit", (code, signal) => {
  exited = true;
  stderrChunks.push(`\n[exit] code=${code} signal=${signal}\n`);
});

try {
  await waitForRoute(url, "/today", {}, stdoutChunks, stderrChunks);
  await waitForRoute(url, "/settings", {}, stdoutChunks, stderrChunks);
  await waitForRoute(
    url,
    "/api/v1/blocker/state",
    { headers: { "X-Life-OS-Token": token } },
    stdoutChunks,
    stderrChunks,
  );
  if (exited) fail("Electron standalone exited during smoke test", tail(stderrChunks));
  console.log("[verify-electron-standalone] OK: Electron ABI smoke test passed");
} finally {
  if (!exited && !child.killed) child.kill();
  await waitForExit(child, () => exited);
  await removeTempDir(tempDir);
}
