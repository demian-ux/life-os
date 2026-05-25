# Life OS — Full Audit & Fix Handoff

**Date:** 2026-05-20
**Audience:** Codex (or any AI coding agent picking up from this point)
**Status of the app:** Installed via NSIS; window opens; every route returns **HTTP 500 "Internal Server Error"**.

This document is a self-contained handoff. It includes (1) the root cause of the current 500, (2) a complete inventory of brittle areas / known issues across the codebase, and (3) a prioritized, actionable fix list with exact file paths and code-level guidance.

---

## 0. Project shape (1-minute orientation)

- **Stack:** Next.js 16.2.4 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4 + Prisma 7 + SQLite (via `@prisma/adapter-better-sqlite3`) + Electron 42 + electron-builder NSIS installer.
- **Layout:**
  - `src/app/**` — App Router pages, layout, server actions, route handlers
  - `src/components/**` — UI primitives in `ui/`, feature components alongside their domain
  - `src/lib/**` — db, dates, validators, server actions, retention engine
  - `src/lib/retention/**` — Phase G–J retention architecture (traits, titles, seasons, streak tiers, quests, bonuses, insights, recap, blocker)
  - `prisma/schema.prisma` — single SQLite schema; migrations in `prisma/migrations/`
  - `electron/main.ts`, `electron/preload.ts`, `electron/tsconfig.json` — Electron main process (compiled to `electron-dist/`)
  - `resources/*.ps1` — privileged Windows blocker scripts
  - `scripts/flatten-standalone.mjs` — post-build step that hoists pnpm deps in `.next/standalone/`
  - `package.json` — has an `electron-builder` `"build"` block; NSIS target
- **Dev workflow:** `pnpm dev` (Next.js dev server, port 3000). Electron dev: `pnpm electron:dev`.
- **Prod packaging:** `pnpm electron:dist` → `dist/Life OS Setup 0.1.0.exe`.
- **Phases completed in session:**
  - A–F: design system overhaul (tokens, primitives, screens, motion, a11y, identity polish)
  - G–J: retention architecture (Identity layer, Infinite Game, Craving Machine, Year Recap)
  - L: Windows desktop app (Electron + hosts-file blocker + toast notifications + NSIS installer)
- **Phases not yet executed:** iOS (Path A / B from earlier planning). Currently scoped, not implemented.

---

## 1. The immediate 500 — root cause + fix

### Symptom

Window loads from the installed app. Every page returns HTTP 500. Title bar shows the Electron app icon, body shows Next.js's default Internal Server Error page.

### Evidence

Captured in `%APPDATA%\life-os\next-server.log` (note: lowercase `life-os`, not `Life OS` — see issue 2.1):

```
[err] ⨯ Error: Failed to load external module better-sqlite3-6af3159004069310:
        Error: Cannot find module 'better-sqlite3-6af3159004069310'
Require stack:
- ...\.next\standalone\.next\server\chunks\ssr\[root-of-the-server]__04bs~wa._.js
- ...\.next\standalone\.next\server\chunks\ssr\[turbopack]_runtime.js
- ...\.next\standalone\.next\server\app\_global-error\page.js
- ...\.next\standalone\node_modules\next\dist\server\require.js
...
at Context.externalRequire [as x] (...turbopack]_runtime.js:624:15)
```

### Cause

Turbopack externalizes native modules (e.g. `better-sqlite3`, `@prisma/client`) using **hashed identifiers** of the form `<pkgname>-<hash>` (e.g. `better-sqlite3-6af3159004069310`, `@prisma/client-4d6b41f7ec0af3c1`). At build time, Next.js places **symlinks** at `.next/standalone/.next/node_modules/<hashed-name>/` pointing at the dev project's absolute `node_modules` path. The bundled SSR runtime then calls `require("<pkgname>-<hash>")` directly.

The current `scripts/flatten-standalone.mjs` includes a `purgeRemainingSymlinks(STANDALONE)` step which **unlinks these without replacing them** — based on the (incorrect) assumption that they were stale trace-cache pointing at dev paths. They are not stale: they are the *only* path by which Turbopack's runtime can find externalized native modules.

### Fix

In `scripts/flatten-standalone.mjs`, replace `purgeRemainingSymlinks` with a function that **rewrites each symlink to a real directory containing the correct package contents**, derived from the (already-flattened) `node_modules/<basename>` at the standalone root.

#### Reference implementation

```js
/**
 * Walk .next/standalone/.next/node_modules and turn each symlink into a
 * real directory containing the package's actual files. The directory keeps
 * its hashed name (e.g. "better-sqlite3-6af3159004069310") because that's
 * what Turbopack's runtime requires by name.
 *
 * Each entry in .next/node_modules has the form:
 *   "<pkgname>-<hash>"        (unscoped, e.g. better-sqlite3-...)
 *   "@scope/<pkgname>-<hash>" (scoped, e.g. @prisma/client-...)
 *
 * Strip the trailing "-<hash>" segment to find the base package name, then
 * look it up under .next/standalone/node_modules/<basename> (which the
 * hoist step earlier in this script has already populated as a real dir).
 */
function rewriteTurbopackExternals(traceDir, sourceNodeModules) {
  if (!fs.existsSync(traceDir)) return;
  const entries = fs.readdirSync(traceDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(traceDir, entry.name);

    // Scoped: recurse one level deeper.
    if (entry.isDirectory() && entry.name.startsWith("@")) {
      rewriteTurbopackExternalsScoped(full, entry.name, sourceNodeModules);
      continue;
    }

    if (!entry.isSymbolicLink()) continue;
    const basename = stripHash(entry.name);
    if (!basename) continue;
    const realSource = join(sourceNodeModules, basename);
    if (!fs.existsSync(realSource)) {
      console.warn(`[flatten] no source for ${entry.name} (looked for ${basename})`);
      fs.unlinkSync(full);
      continue;
    }
    fs.unlinkSync(full);
    copyDir(realSource, full);
  }
}

function rewriteTurbopackExternalsScoped(scopeDir, scopeName, sourceNodeModules) {
  for (const entry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
    const full = join(scopeDir, entry.name);
    if (!entry.isSymbolicLink()) continue;
    const basename = stripHash(entry.name);
    if (!basename) continue;
    const realSource = join(sourceNodeModules, scopeName, basename);
    if (!fs.existsSync(realSource)) {
      fs.unlinkSync(full);
      continue;
    }
    fs.unlinkSync(full);
    copyDir(realSource, full);
  }
}

/** "better-sqlite3-6af3159004069310" → "better-sqlite3"; null if no hash suffix. */
function stripHash(name) {
  const m = name.match(/^(.+)-[a-f0-9]{8,}$/);
  return m ? m[1] : null;
}
```

Wire it in `flatten-standalone.mjs` **after** `removePnpmDir()` and **instead of** `purgeRemainingSymlinks(STANDALONE)`:

```js
console.log(`[flatten] rewriting Turbopack-externalized native modules ...`);
rewriteTurbopackExternals(
  join(STANDALONE, ".next", "node_modules"),
  NM, // .next/standalone/node_modules — already flattened above
);
```

#### Verification steps after the fix

1. `rm -rf dist .next/standalone .next/static`
2. `pnpm build && pnpm electron:flatten`
3. Confirm no broken symlinks remain: `find .next/standalone -type l` should print nothing.
4. Confirm the hashed dirs are real and populated:
   `ls ".next/standalone/.next/node_modules/better-sqlite3-*/build/Release/better_sqlite3.node"` should succeed.
5. Smoke-run the standalone server (already wired in the project's docs):
   ```powershell
   $env:DATABASE_URL = "file:$(Resolve-Path .\prisma\dev.db)"
   $env:PORT = "3019"
   $env:LIFE_OS_API_TOKEN = "test"
   node .\.next\standalone\server.js
   # in another shell:
   curl http://127.0.0.1:3019/today  # expect 200
   ```
6. `pnpm electron:dist` → install → confirm `/today` renders.

#### Why this is the right structural fix (vs. workarounds)

- The hashed names are stable per (pkg, version, deps-tree); they survive across builds *as long as the package versions don't change*. They aren't generated nondeterministically.
- The runtime requires them by exact name. We must keep the name.
- We can't keep the symlinks — they reference my (the author's) absolute dev path, broken on every user's machine.
- Therefore: **same name, same shape, real local contents**. Copy the hoisted module into the hashed-name slot.

#### Future-proofing note

Next.js's standalone output behavior re: Turbopack externals is undocumented and may change. After every Next.js minor upgrade, run the verification steps above before shipping the installer.

---

## 2. Other production-runtime issues

### 2.1 userData path — `life-os` not `Life OS`

**Severity:** Low (cosmetic / docs), but it's misled debugging twice already.

Electron's `app.getPath("userData")` uses the **`name`** field from `package.json` (which is `"life-os"`), not `productName` (which is `"Life OS"`). All my documentation referenced `%APPDATA%\Life OS\`. Real path is `%APPDATA%\life-os\`.

**Where this appears:**
- `electron/main.ts` writes blocker-config.json, next-server.log, error.log, dev.db all under `app.getPath("userData")` → `%APPDATA%\life-os\`.
- `resources/blocker.ps1` reads from `$env:LOCALAPPDATA\Life OS\blocker-config.json` (line 11). **This is the wrong path twice over** — wrong base (`LOCALAPPDATA` vs `APPDATA`) and wrong casing (`Life OS` vs `life-os`).
- `resources/install-blocker.ps1` doesn't hit this directly.
- `scripts/setup-dev-blocker.ps1` uses `$env:LOCALAPPDATA\Life OS\` for the dev-mode config — also wrong vs what Electron writes.

**Fix options (pick one consistently):**

A. **Force Electron's userData to match what the rest of the world expects.** Add to `electron/main.ts`, before `app.whenReady()`:
   ```ts
   app.setPath("userData", path.join(app.getPath("appData"), "Life OS"));
   ```
   Plus call `app.setName("Life OS")` to make `getPath("logs")` and similar also match. The downside is that everyone who installed the buggy versions has data under `%APPDATA%\life-os\` and will lose it on upgrade. Migrate by copying contents at startup if the old path exists.

B. **Update all PowerShell scripts and docs to use the actual `%APPDATA%\life-os\` path.** This is the lower-friction fix. Recommended.

**Recommended fix (B):**

- `resources/blocker.ps1` line 11:
  ```diff
  - $AppData    = Join-Path $env:LOCALAPPDATA "Life OS"
  + $AppData    = Join-Path $env:APPDATA "life-os"
  ```
- `scripts/setup-dev-blocker.ps1` lines 14–16:
  ```diff
  - $AppData     = Join-Path $env:LOCALAPPDATA "Life OS"
  + $AppData     = Join-Path $env:APPDATA "life-os"
  ```

Also update the doc references in:
- `resources/uninstall-blocker.ps1` — doesn't use the path directly. Skip.
- Any README / Audit doc — already updated in this file.

### 2.2 DATABASE_URL on Windows with spaces

**Severity:** Medium. Currently works because the resolved path is `%APPDATA%\life-os\dev.db` which has no spaces. If a user installs with a profile name containing spaces (uncommon but possible), or if 2.1 is fixed by switching to `Life OS`, the URL `file:C:\Users\demia\AppData\Roaming\Life OS\dev.db` may misbehave.

**Where this matters:**
- `electron/main.ts` `startNextServer()`: ``DATABASE_URL: `file:${dbPath}` ``
- `src/lib/db.ts` consumes `process.env.DATABASE_URL` and passes it directly to `PrismaBetterSqlite3`.

**Recommended fix:**

1. URL-encode the path or wrap in quotes that the adapter understands.
2. Better: use forward slashes (works on Windows for SQLite).
3. Best: bypass URL parsing — pass an absolute filesystem path directly to the adapter.

Concrete change in `electron/main.ts`:
```diff
- DATABASE_URL: `file:${dbPath}`,
+ DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
```

And consider updating `src/lib/db.ts` to detect when the URL is unparseable and fall back to a path-only construction.

### 2.3 No migration check at runtime

**Severity:** Medium-High.

The installer bundles `prisma/dev.db` as `seed.db`. On first launch, `ensureUserDb()` copies it to userData. From then on, the user's DB drifts from whatever migrations live in the installer.

When you ship v0.2 with a new migration, the installer's bundled seed.db has the new schema, but **users upgrading will keep their existing dev.db** which doesn't have the new tables / columns. Every Prisma query that references new columns will fail.

**Fixes (graduate as the app matures):**

- **v1 (do now):** Add a "DB schema check" at Electron startup. After `ensureUserDb()`, open the SQLite file, query `PRAGMA user_version` (or check for a known recent table like `BlockRule`). If the schema is older than the installer expects, surface a clear error window with instructions ("Your DB is from an older version. Back up `%APPDATA%\life-os\dev.db` and delete it to upgrade.").
- **v2:** Bundle Prisma migrations with the installer and run `prisma migrate deploy` at startup against the user's DB. Requires shipping the `prisma` CLI in resources and the migration SQL files. ~1 day of work.
- **v3:** Auto-migrate silently with a backup-first approach. Better UX, more complex.

### 2.4 Better-sqlite3 ABI rebuild

**Severity:** Currently fine, but fragile.

`@electron/rebuild` runs as part of `electron-builder` and rebuilds native modules against Electron's Node ABI. This works today but:
- The dev project's `node_modules/better-sqlite3/build/Release/better_sqlite3.node` is built for Node 20 (the system Node version per `package.json` engines and pnpm install).
- `pnpm electron:dev` uses Electron's Node (currently v24 per `Node.js v24.15.0` shown in earlier logs). They happen to be ABI-compatible enough.
- The installer rebuilds against Electron v42's Node. Good.
- **Risk:** if Electron's Node version skews further from the dev Node, dev-mode may break unexpectedly with `NODE_MODULE_VERSION mismatch`.

**Fixes:**
- Add a `postinstall` script that runs `@electron/rebuild` for the local node_modules (so dev mode always uses Electron-compatible bindings).
- Or document: "Run `pnpm exec electron-rebuild` if dev-mode Prisma errors with ABI mismatch."

### 2.5 Asar packaging — Prisma engines + schema

**Severity:** Currently working; fragile.

In `package.json` `build.asarUnpack`:
```json
"asarUnpack": [
  "**/.prisma/**",
  "**/@prisma/**",
  "**/better-sqlite3/**",
  "**/*.node",
  ".next/standalone/**"
]
```

- `.next/standalone/**` being asar-unpacked is correct (we spawn server.js as a child process and it can't read from inside asar).
- `**/@prisma/**` and `**/.prisma/**` cover both the client runtime and any generated client files.
- `**/*.node` is the wildcard for any native binding.

**Verify:** after building, `dist/win-unpacked/resources/app.asar.unpacked/` should contain:
- `.next/standalone/server.js`
- `.next/standalone/node_modules/@prisma/client/`
- `.next/standalone/node_modules/better-sqlite3/`
- `.next/standalone/node_modules/.prisma/client/` (the generated client)

After fix #1.1 (Turbopack-externalized natives), also verify:
- `.next/standalone/.next/node_modules/better-sqlite3-<hash>/build/Release/better_sqlite3.node`
- `.next/standalone/.next/node_modules/@prisma/client-<hash>/`

### 2.6 Error visibility before Next.js boots

**Severity:** Medium.

`fatalLog()` in `electron/main.ts` writes to `error.log` only on errors thrown by code we control. If Electron itself fails to launch (bad asar, missing DLL, signing issue), there's nothing.

**Fix:** add `process.on("uncaughtException", fatalLog)` and `process.on("unhandledRejection", fatalLog)` at top of `electron/main.ts`.

### 2.7 First-run UAC race condition

**Severity:** Low. The blocker scheduled task install via `ensureBlockerInstalled()` runs detached. If the user denies UAC, the blocker never gets installed and we don't track that fact. The user sees the Site Blocking rule in `/settings` showing "Blocking" but no actual blocking happens.

**Fix:**
- Persist "blocker install attempt status" in a file or DB.
- On `/settings` page, show a yellow banner: "Blocker not registered — click Reinstall to fix" if the Scheduled Task isn't present.
- Provide a "Reinstall blocker" button that re-runs `install-blocker.ps1`.

### 2.8 Toast notifications: AppUserModelID timing

**Severity:** Low.

`app.setAppUserModelId("com.demian.lifeos")` is called inside `app.whenReady()` *after* the first `await`. Some Windows-side toast plumbing reads this earlier. Safer: call it before `whenReady` resolves.

**Fix:** move `app.setAppUserModelId(...)` to the top of the file, immediately after the import block. Also call `app.setName("Life OS")` so cross-process attribution matches.

### 2.9 Open-at-login adds itself even when blocker install fails

**Severity:** Low. Cosmetic but annoying. If install fails, the app still registers itself for auto-launch. User reboots into a broken app.

**Fix:** only call `setLoginItemSettings({ openAtLogin: true, ... })` after `startNextServer()` succeeds.

---

## 3. Blocker (Phase L) issues

### 3.1 Blocker config path mismatch

See 2.1 above. The blocker reads from `%LOCALAPPDATA%\Life OS\blocker-config.json` while Electron writes to `%APPDATA%\life-os\blocker-config.json`. **The blocker has been silently never reading the right config in any installed version.** It logs "No config found, sleeping..." every 30 seconds.

Verify via `%APPDATA%\life-os\blocker.log` (note: blocker writes its own log to the same dir convention as it reads from — also needs the fix).

### 3.2 Dev token in `.env.local` vs Electron-generated token

The dev setup script writes a token to `.env.local`. The installed app generates its OWN token in `blocker-config.json` and sets `LIFE_OS_API_TOKEN` env var when spawning Next.js. These two systems don't know about each other.

**Currently fine** because each is self-contained, but if a user develops AND has the installed app running, they could collide on port. Acceptable for personal use.

### 3.3 DoH bypasses hosts file

Documented earlier in the planning. Not fixed. Domains will resolve via DNS-over-HTTPS in Chrome/Edge/Firefox by default. **Workaround:** disable per browser via registry policy (the `.reg` I outlined was never committed).

**Fix priority: Medium.** Add a `resources/disable-doh.reg` and document in a README that the user must run it once with admin to make blocking effective on modern browsers.

### 3.4 No way to see what's currently blocked from the UI

The Settings page shows "Blocking N domains" but doesn't list them in real time. Would be useful: "Currently blocking: instagram.com, tiktok.com, ..."

**Fix priority: Low.** Add the live list of blocked domains as an expandable section on the Site Blocking card.

### 3.5 Process-level blocking deferred

Per the user's decision, only hosts-file blocking. Native apps (Discord, Slack, etc.) bypass the hosts file by either using their own DNS or by being P2P. Document this limitation.

---

## 4. Retention architecture (Phases G–J)

### 4.1 Coach Read not implemented

Phase I plan included a "hidden score" — a Coach Read text string stored on `User.preferences.coachRead`, updated weekly during review, with 7-day reveal cooldown in Settings. **None of this is implemented.** The `coachRead` field doesn't exist on User.preferences. No UI surface. No update logic.

**Why deferred:** real value requires AI prompt changes to maintain a meaningful string; placeholder text isn't worth the UI.

**Fix priority: Low.** Either implement (requires AI work) or remove from public docs.

### 4.2 Year recap narrative is template-based, not AI-generated

Plan called for AI generation; v1 is `buildNarrative` in `src/lib/retention/recap.ts` which composes from stats. Acceptable v1. AI integration: a new function in `src/lib/ai/` that takes stats + prompt → text, called from `loadRecap` and persisted to `YearlyRecap.narrative`.

**Fix priority: Low.**

### 4.3 Insight detection only fires on `/today` page load

`detectInsights(userId)` is called from `src/app/today/page.tsx`. If the user doesn't visit Today, insights are never detected. Acceptable for v1 since Today is the most-visited page, but if you add a daily background job (Phase L's notification scheduler is the natural home for this), insights would fire reliably.

**Fix priority: Low.**

### 4.4 Streak tier downgrade visual cue

Plan: when current streak < earned peak tier, the Pill on the habit card should subtly dim — "you can see what you lost" (Craving Machine).

**Current behavior:** the peak tier Pill stays bright forever. Loss isn't visible.

**Fix:** in `src/components/habits/HabitCard.tsx`, compare `habit.current` to `habit.peakTier`. If current < `STREAK_TIERS[peakTier-1].days`, render the Pill at reduced opacity or with `tone="skipped"`.

**Fix priority: Medium.** This is mechanism-critical for the Infinite Game phase.

### 4.5 Overall consistency streak (cross-habit)

Plan mentioned "compound streaks — overall consistency streaks (not per-habit) that scale infinitely". **Not implemented.** Only per-habit streaks exist.

**Fix priority: Low.** A new computation: longest run of consecutive days where ≥1 scheduled habit was logged MIN or IDEAL. Surface on `/identity` as "Active days streak: 47".

### 4.6 Quest reward titles

Plan: `rebuild-discipline` quest awards a "Phoenix" title on completion. **Currently:** no title is created from quest completion. The Title model is rule-based only.

**Fix priority: Low.** Add a `rewardTitleSlug` field to Quest, and on transition `ACTIVE → COMPLETE` in `evaluateQuests`, insert a Title row.

### 4.7 AI coach context doesn't include retention state

The AI Chat (Phase 7 of original spec) builds context from week / habits / tasks. It doesn't know about traits, titles, season, active quests, or insights. This means the coach can't reference Demian's current identity ("You're a Consistent Builder this season — playing to that strength, ...").

**Fix priority: Medium for UX.** In `src/lib/ai/context.ts`, add:
- Top 2 traits with current level + 30-day delta
- Active titles
- Current season rank + tier
- Active quests + progress
- Last 3 dismissed insights

---

## 5. Code hygiene

### 5.1 `eslint-config-next` deprecation surface

When running `pnpm lint`, the next ESLint config likely emits warnings (suppressed in current output). Worth auditing once. Not blocking.

### 5.2 Inconsistent Result type across server actions

Most actions return `{ ok: true } | { ok: false; error: string }`. A few return `{ ok: true; data?: T } | ...`. Standardize via a shared `Result<T>` import.

**Fix priority: Low.** Cosmetic.

### 5.3 Many migrations

`prisma/migrations/` has accumulated 5+ migrations across phases. They're correct but bloat the bundle and slow `pnpm db:migrate` in dev. Consider squashing migrations after the next stable release (not before — that breaks anyone's actively-used dev DB).

**Fix priority: Low.** Defer until v0.2 release.

### 5.4 InlineConfirmation overuse pattern

The `savedTick = Date.now()` trick to remount the auto-fading confirmation works but is verbose. Consider extracting a `useInlineConfirmation()` hook that owns the state + render.

**Fix priority: Low.**

### 5.5 TraitRadar SVG sizing

`src/components/identity/TraitRadar.tsx` uses fixed `SIZE=280`. On small viewports it can overflow. Add responsive sizing.

**Fix priority: Low.**

### 5.6 No tests

Zero tests in the project. Acceptable for a personal app but tests around `src/lib/xp.ts`, `src/lib/retention/blocker.ts`, `src/lib/retention/seasons.ts` would catch regressions. Vitest + a small assertion library is enough.

**Fix priority: Medium for habit-critical math.** XP / season / trait calculations are deterministic and easy to test.

### 5.7 `dotenv` is a dev dep but might be needed at runtime for the standalone

The standalone server runs without dotenv. Env vars come from the Electron parent process (`DATABASE_URL`, `LIFE_OS_API_TOKEN`). This is fine. But if anyone runs `node server.js` directly (e.g. for debugging), no `.env.local` will load.

**Fix priority: Low.** Document or add an `if (!process.env.DATABASE_URL) require("dotenv").config()` guard at top of server.js (would require patching after build — not worth it).

---

## 6. Build pipeline issues

### 6.1 Flatten step is fragile

`scripts/flatten-standalone.mjs` makes assumptions about pnpm's tree shape. If pnpm changes its internal layout (it has historically), this breaks silently. Verify on every pnpm major upgrade.

### 6.2 No build step verification

`pnpm electron:dist` runs `pnpm build && pnpm electron:flatten && pnpm electron:compile && electron-builder`. There's no smoke test of the standalone before electron-builder runs. The audit's fix #1 includes manual verification steps — these should be a script.

**Fix priority: Medium.** Add `scripts/verify-standalone.mjs` that spawns `node .next/standalone/server.js` with a temp DB, hits `http://127.0.0.1:<port>/today`, expects 200, kills the server. Run as the last step of `electron:flatten`.

### 6.3 No code signing

The installer is unsigned. SmartScreen warning every time. Personal use OK. If/when sharing: ~$80/yr for a code-signing cert.

### 6.4 No version-bump automation

Each new release requires manually editing `package.json` `version`, rebuilding, distributing. Add a small `scripts/release.mjs` that bumps version, regenerates installer, and tags git.

**Fix priority: Low.** Not critical for personal use.

### 6.5 No icon

`build-resources/icon.ico` doesn't exist. Installer uses generic Electron icon. Drop in a real ICO when one exists. The placeholder `electron/tray.png` is only used for the system tray.

---

## 7. iOS (deferred — not yet implemented)

Per the planning conversation, the user committed to:
- **Path A first**: PWA + web push + iOS Shortcuts API integration
- **Path B later, if needed**: Native Swift companion app with FamilyControls
- **Skip Path C**: full cloud migration

**Status:** Not started. Plan exists in conversation history.

**Files that would be added for Path A:**
- `public/manifest.webmanifest`
- `src/app/sw.ts` (service worker)
- `src/app/icons/*` (app icons)
- `src/app/layout.tsx` — add iOS meta tags
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/push/send/route.ts`
- `src/lib/push.ts`
- Prisma model: `PushSubscription`
- `src/app/api/v1/today/route.ts`, `habits/due/route.ts`, etc.

**Fix priority: Defer.** User asked to handle Windows first; iOS comes later.

---

## 8. Prioritized fix list (execute in this order)

### P0 — Ship-blocker

1. **Fix `scripts/flatten-standalone.mjs`** — replace `purgeRemainingSymlinks` with `rewriteTurbopackExternals`. See section 1 for reference implementation.
2. **Rebuild installer** — `rm -rf dist .next/standalone && pnpm electron:dist`.
3. **Verify standalone before packaging** — run the verification snippet in section 1, confirm 200 on `/today`.

### P1 — Make the blocker actually work end-to-end

4. **Fix path mismatch in `resources/blocker.ps1`** — change `$env:LOCALAPPDATA "Life OS"` to `$env:APPDATA "life-os"` (line 11 region). See section 2.1.
5. **Fix path mismatch in `scripts/setup-dev-blocker.ps1`** — same change.
6. **Add DoH disable script** — commit `resources/disable-doh.reg` and reference in install docs.

### P2 — Stability / debuggability

7. **Add uncaught exception handlers in `electron/main.ts`** (section 2.6).
8. **Forward-slash the DATABASE_URL path** in `electron/main.ts` (section 2.2).
9. **Add `scripts/verify-standalone.mjs`** (section 6.2).
10. **Surface blocker-install failures in UI** (section 2.7).

### P3 — Polish

11. **Streak tier downgrade visual** in `HabitCard.tsx` (section 4.4) — actually mechanism-critical for retention, worth doing before any new users.
12. **Schema-version check at startup** (section 2.3).
13. **AI context includes retention state** (section 4.7).

### P4 — Defer

14. iOS Path A — separate phase
15. Tests — separate effort
16. Code signing — when distributing publicly
17. AI-generated year recap (section 4.2)
18. Coach Read (section 4.1)

---

## 9. File reference index

Files that the audit references and a fixer will likely touch:

| File | Why |
|---|---|
| `scripts/flatten-standalone.mjs` | **P0 fix** — Turbopack externals |
| `package.json` (build block + scripts) | electron-builder config; new scripts |
| `electron/main.ts` | uncaught handlers; DATABASE_URL path; AUMID timing |
| `resources/blocker.ps1` | userData path fix |
| `scripts/setup-dev-blocker.ps1` | userData path fix |
| `resources/disable-doh.reg` (new) | DoH bypass workaround |
| `src/components/habits/HabitCard.tsx` | streak tier downgrade visual |
| `src/lib/ai/context.ts` | include retention state |
| `src/lib/retention/blocker.ts` | engine — read only, healthy |
| `src/lib/retention/notifications.ts` | engine — read only, healthy |
| `prisma/schema.prisma` | read only, healthy |
| `src/lib/db.ts` | possibly path-construction hardening |

---

## 10. How to verify "fixed"

After P0 + P1 work:

1. **Uninstall any existing Life OS** — Settings → Apps → Life OS → Uninstall. Then `pwsh -File resources/uninstall-blocker.ps1` to clean the scheduled task and hosts file.
2. **Delete `%APPDATA%\life-os\`** — fresh start.
3. **Rebuild** — `rm -rf dist .next/standalone && pnpm electron:dist`.
4. **Install** — run `dist/Life OS Setup 0.1.0.exe`.
5. **Launch** — window opens to `/today` within ~10s. Title bar reads "Life OS". Background is warm paper, not black.
6. **Tray** — sage circle in system tray, right-clickable menu present.
7. **DB exists** — `Test-Path "$env:APPDATA\life-os\dev.db"` returns True.
8. **Server log** — `Get-Content "$env:APPDATA\life-os\next-server.log"` shows "Ready in Xms" and no errors.
9. **Blocker installed** — `Get-ScheduledTask -TaskName "LifeOS-Blocker"` succeeds. After UAC accept.
10. **Blocker config readable** — `Test-Path "$env:APPDATA\life-os\blocker-config.json"` returns True.
11. **Blocker is polling** — `Get-Content "$env:APPDATA\life-os\blocker.log"` shows "Applied: N domain(s) blocked" after ~30s.
12. **Actual block** — try opening `https://instagram.com` in Chrome (with DoH disabled per P1.6). Page fails. Log Meditation as MINIMUM on `/today`. Wait 30s. Refresh Instagram. Page loads.

If any step fails, capture: `Get-Content "$env:APPDATA\life-os\next-server.log" -Tail 100`, `Get-Content "$env:APPDATA\life-os\error.log"`, `Get-Content "$env:APPDATA\life-os\blocker.log" -Tail 50`.

---

## 11. Out of scope for this audit

These exist in the codebase and aren't broken — just not analyzed here:

- Phase A–F design system overhaul (`src/components/ui/`, `src/app/globals.css`) — solid and tested.
- AI chat (`src/app/ai/`, `src/lib/ai/`) — works in dev; not exercised in this audit.
- Year recap (`src/app/recap/`, `src/lib/retention/recap.ts`) — runs; could be richer (section 4.2).
- The 80+ tasks completed across phases are tracked in the conversation transcript; this audit doesn't re-list them.

---

## 12. Background context for the next agent

This codebase grew across 15 phases in one extended session:
- The spec at `docs/life-os-spec.md` is the source of truth for product intent.
- Phases A–F (design system) and G–J (retention architecture) added significant code on top of the spec's MVP.
- Phase L (Windows desktop) is the most-recent and most-fragile layer.
- The user is the sole user and the developer — local-first single-user is by design.
- Anti-shame and calm-by-default are honored throughout the design.
- Variable rewards are present but capped (max 4× multiplier).
- Habit blocking is intentional friction, not punishment — disconnecting the blocker should be possible from the user side at any time (and is: the user can disable rules in Settings, kill the scheduled task, or edit the hosts file manually).

Read `docs/life-os-spec.md` and `docs/assumptions.md` if you want to understand the intent before changing logic.

End of audit.
