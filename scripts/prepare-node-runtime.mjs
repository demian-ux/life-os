#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const outDir = path.join(ROOT, "resources", "node-runtime");
const exeName = process.platform === "win32" ? "node.exe" : "node";
const dest = path.join(outDir, exeName);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(process.execPath, dest);

console.log(`[prepare-node-runtime] copied ${process.execPath} -> ${dest}`);
