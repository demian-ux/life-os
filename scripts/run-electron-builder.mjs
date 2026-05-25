#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const shimDir = path.join(ROOT, "scripts", "shims");
const builder = path.join(ROOT, "node_modules", "electron-builder", "cli.js");

const result = spawnSync(process.execPath, [builder, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ""}`,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
