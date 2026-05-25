#!/usr/bin/env node
/**
 * Flatten .next/standalone/node_modules for distribution.
 *
 * pnpm leaves a symlink-heavy tree. For the installer we need a clean,
 * npm-style layout that NSIS can package and Node can resolve at runtime.
 */

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STANDALONE = join(ROOT, ".next", "standalone");
const NM = join(STANDALONE, "node_modules");
const PNPM = join(NM, ".pnpm");
const NEXT_STATIC = join(ROOT, ".next", "static");
const PUBLIC = join(ROOT, "public");

if (!fs.existsSync(STANDALONE)) {
  console.error(`No .next/standalone at ${STANDALONE}. Run \`pnpm build\` first.`);
  process.exit(1);
}

let pkgsHoisted = 0;
let symlinksResolved = 0;
let filesCopied = 0;
let turbopackExternalsRewritten = 0;

function realSourceOf(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    const stat = fs.lstatSync(srcPath);
    if (stat.isSymbolicLink()) {
      const real = realSourceOf(srcPath);
      if (!real) continue;
      try {
        const realStat = fs.statSync(real);
        if (realStat.isDirectory()) {
          copyDir(real, destPath);
        } else {
          fs.copyFileSync(real, destPath);
          filesCopied += 1;
        }
      } catch {}
    } else if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      filesCopied += 1;
    }
  }
}

function hoistPackage(pkgName, srcDir) {
  const dest = join(NM, pkgName);
  const srcStat = fs.lstatSync(srcDir);
  const real = realSourceOf(srcDir);
  if (srcStat.isSymbolicLink() && !real) return;

  if (fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(dest);
    } else if (
      fs.existsSync(join(srcDir, "package.json")) &&
      !fs.existsSync(join(dest, "package.json"))
    ) {
      fs.rmSync(dest, { recursive: true, force: true });
    } else {
      return;
    }
  }
  copyDir(real ?? srcDir, dest);
  pkgsHoisted += 1;
}

function resolveTopLevelSymlinks() {
  for (const entry of fs.readdirSync(NM, { withFileTypes: true })) {
    if (entry.name === ".pnpm") continue;
    const full = join(NM, entry.name);
    if (entry.isSymbolicLink()) {
      const real = realSourceOf(full);
      if (!real) continue;
      fs.unlinkSync(full);
      copyDir(real, full);
      symlinksResolved += 1;
    } else if (entry.name.startsWith("@") && entry.isDirectory()) {
      for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
        const subFull = join(full, sub.name);
        if (sub.isSymbolicLink()) {
          const real = realSourceOf(subFull);
          if (!real) continue;
          fs.unlinkSync(subFull);
          copyDir(real, subFull);
          symlinksResolved += 1;
        }
      }
    }
  }
}

function harvestFromPnpm() {
  if (!fs.existsSync(PNPM)) return;
  for (const versioned of fs.readdirSync(PNPM, { withFileTypes: true })) {
    if (!versioned.isDirectory()) continue;
    const pkgsDir = join(PNPM, versioned.name, "node_modules");
    if (!fs.existsSync(pkgsDir)) continue;
    for (const pkgEntry of fs.readdirSync(pkgsDir, { withFileTypes: true })) {
      const pkgName = pkgEntry.name;
      const srcDir = join(pkgsDir, pkgName);
      if (pkgName.startsWith("@")) {
        if (!pkgEntry.isDirectory()) continue;
        for (const sub of fs.readdirSync(srcDir, { withFileTypes: true })) {
          const subSrc = join(srcDir, sub.name);
          const fullName = `${pkgName}/${sub.name}`;
          hoistPackage(fullName, subSrc);
        }
      } else {
        hoistPackage(pkgName, srcDir);
      }
    }
  }
}

function removePnpmDir() {
  if (fs.existsSync(PNPM)) {
    fs.rmSync(PNPM, { recursive: true, force: true });
  }
}

function copyRuntimeAssets() {
  if (fs.existsSync(NEXT_STATIC)) {
    const dest = join(STANDALONE, ".next", "static");
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(NEXT_STATIC, dest);
  }
  if (fs.existsSync(PUBLIC)) {
    const dest = join(STANDALONE, "public");
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(PUBLIC, dest);
  }
}

/**
 * Turbopack's standalone runtime may require native externals by hashed names
 * such as "better-sqlite3-6af3159004069310" or "@prisma/client-...".
 * Next emits those as symlinks under .next/node_modules. The symlink targets
 * point back to the build machine, so distribution needs real directories with
 * the same hashed names and the package contents copied from standalone's
 * flattened top-level node_modules.
 */
function rewriteTurbopackExternals(traceDir, sourceNodeModules) {
  if (!fs.existsSync(traceDir)) return;

  for (const entry of fs.readdirSync(traceDir, { withFileTypes: true })) {
    const full = join(traceDir, entry.name);

    if (entry.isDirectory() && entry.name.startsWith("@")) {
      rewriteTurbopackExternalsScoped(full, entry.name, sourceNodeModules);
      continue;
    }

    if (!entry.isSymbolicLink()) continue;

    const basename = stripHash(entry.name);
    if (!basename) continue;

    const packageName = basename;
    const realSource = join(sourceNodeModules, packageName);
    if (!fs.existsSync(realSource)) {
      console.warn(
        `[flatten] no source for ${entry.name} (looked for ${packageName})`,
      );
      fs.unlinkSync(full);
      symlinksResolved += 1;
      continue;
    }

    fs.unlinkSync(full);
    writeExternalProxy(full, entry.name, packageName);
    symlinksResolved += 1;
    turbopackExternalsRewritten += 1;
  }
}

function rewriteTurbopackExternalsScoped(scopeDir, scopeName, sourceNodeModules) {
  for (const entry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
    const full = join(scopeDir, entry.name);
    if (!entry.isSymbolicLink()) continue;

    const basename = stripHash(entry.name);
    if (!basename) continue;

    const packageName = `${scopeName}/${basename}`;
    const realSource = join(sourceNodeModules, scopeName, basename);
    if (!fs.existsSync(realSource)) {
      console.warn(
        `[flatten] no source for ${scopeName}/${entry.name} (looked for ${packageName})`,
      );
      fs.unlinkSync(full);
      symlinksResolved += 1;
      continue;
    }

    fs.unlinkSync(full);
    writeExternalProxy(full, `${scopeName}/${entry.name}`, packageName);
    symlinksResolved += 1;
    turbopackExternalsRewritten += 1;
  }
}

function writeExternalProxy(dest, aliasName, packageName) {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(
    join(dest, "package.json"),
    JSON.stringify({ name: aliasName, private: true, main: "index.js" }, null, 2),
  );
  fs.writeFileSync(
    join(dest, "index.js"),
    `module.exports = require(${JSON.stringify(packageName)});\n`,
  );
}

function stripHash(name) {
  const match = name.match(/^(.+)-[a-f0-9]{8,}$/);
  return match ? match[1] : null;
}

function assertNoSymlinks(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      found.push(full);
    } else if (entry.isDirectory()) {
      assertNoSymlinks(full, found);
    }
  }
  return found;
}

console.log(`[flatten] resolving top-level symlinks under ${NM} ...`);
resolveTopLevelSymlinks();
console.log(`[flatten] harvesting packages from .pnpm/ ...`);
harvestFromPnpm();
console.log(`[flatten] removing .pnpm/ ...`);
removePnpmDir();
console.log(`[flatten] copying standalone runtime assets ...`);
copyRuntimeAssets();
console.log(`[flatten] rewriting Turbopack-externalized native modules ...`);
rewriteTurbopackExternals(join(STANDALONE, ".next", "node_modules"), NM);

const remainingSymlinks = assertNoSymlinks(STANDALONE);
if (remainingSymlinks.length > 0) {
  console.error(`[flatten] ${remainingSymlinks.length} symlink(s) remain:`);
  for (const link of remainingSymlinks.slice(0, 20)) {
    console.error(`  ${link}`);
  }
  if (remainingSymlinks.length > 20) console.error("  ...");
  process.exit(1);
}

console.log(
  `[flatten] done. ${symlinksResolved} symlink(s) resolved, ${pkgsHoisted} package(s) hoisted, ${turbopackExternalsRewritten} Turbopack external(s) rewritten, ${filesCopied} file(s) copied.`,
);
