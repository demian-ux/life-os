import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  nativeImage,
  shell,
} from "electron";
import { spawn, ChildProcess, execFile } from "node:child_process";
import * as crypto from "node:crypto";
import {
  appendFileSync,
  existsSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import * as path from "node:path";

app.setName("Life OS");
app.setPath("userData", path.join(app.getPath("appData"), "life-os"));
if (process.platform === "win32") {
  app.setAppUserModelId("com.demian.lifeos");
}

/**
 * Life OS — Electron main process.
 *
 * Two run modes:
 *   - Dev:    NEXT_DEV_URL is set (e.g. "http://localhost:3000"). We just
 *             create the window pointing at that URL. The dev server runs
 *             separately via `pnpm dev`.
 *   - Prod:   we spawn `.next/standalone/server.js` with the bundled Node
 *             runtime so native SQLite bindings use the Node ABI they were
 *             installed with.
 *
 * In prod, the DB lives at `app.getPath("userData")/dev.db`. On first run we
 * copy the bundled seed DB into place if the target doesn't exist yet.
 */

const DEV_URL = process.env.NEXT_DEV_URL;
const isDev = Boolean(DEV_URL);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let nextProcess: ChildProcess | null = null;
let isQuitting = false;
let targetUrl = "";

type ServerInfo = {
  url: string;
  token: string;
};

// Single-instance lock — second launch focuses the existing window.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

/** Pick a free port for the Next.js server (prod mode only). */
function pickPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address !== null) {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not allocate port"));
      }
    });
  });
}

/** Wait until the Next.js server starts responding on `port`. */
function waitForReady(port: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Next.js server did not start within ${timeoutMs}ms`));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

function resolveStandaloneServer(): string {
  const packagedPath = path.join(
    process.resourcesPath ?? "",
    "app.asar.unpacked",
    ".next",
    "standalone",
    "server.js",
  );
  if (existsSync(packagedPath)) return packagedPath;
  return path.join(app.getAppPath(), ".next", "standalone", "server.js");
}

function resolveResourcesDir(): string {
  // Packaged: bundled under app.asar.unpacked/resources or process.resourcesPath
  const packaged = path.join(process.resourcesPath ?? "", "blocker.ps1");
  if (existsSync(packaged)) return process.resourcesPath ?? "";
  return path.join(app.getAppPath(), "resources");
}

function resolveNodeRuntime(): { exePath: string; electronRunAsNode: boolean } {
  const packagedNode = path.join(
    process.resourcesPath ?? "",
    "node-runtime",
    process.platform === "win32" ? "node.exe" : "node",
  );
  if (existsSync(packagedNode)) {
    return { exePath: packagedNode, electronRunAsNode: false };
  }
  return { exePath: process.execPath, electronRunAsNode: true };
}

/**
 * Read existing blocker token from the config file, or generate a new one
 * and write it. Returns the token. The config also tells the privileged
 * blocker PowerShell which port the Next.js server is on.
 */
function ensureBlockerConfig(port: number): string {
  const dir = app.getPath("userData");
  mkdirSync(dir, { recursive: true });
  const configPath = path.join(dir, "blocker-config.json");

  let token: string;
  if (existsSync(configPath)) {
    try {
      const existing = JSON.parse(readFileSync(configPath, "utf8")) as {
        token?: string;
      };
      token = existing.token ?? generateToken();
    } catch {
      token = generateToken();
    }
  } else {
    token = generateToken();
  }

  const config = {
    apiUrl: `http://127.0.0.1:${port}`,
    token,
    intervalSeconds: 30,
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return token;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Best-effort: check if the LifeOS-Blocker Scheduled Task is registered.
 * If not, kick off install-blocker.ps1 — it self-elevates via UAC.
 *
 * We don't await the install; the task can register asynchronously while
 * the user uses the app.
 */
function ensureBlockerInstalled(): void {
  execFile(
    "schtasks.exe",
    ["/Query", "/TN", "LifeOS-Blocker"],
    (err) => {
      if (!err) return; // Already installed
      const installScript = path.join(resolveResourcesDir(), "install-blocker.ps1");
      const blockerScript = path.join(resolveResourcesDir(), "blocker.ps1");
      if (!existsSync(installScript)) {
        console.error("[life-os] install-blocker.ps1 not found at", installScript);
        return;
      }
      console.log("[life-os] Registering blocker Scheduled Task (UAC may prompt)");
      spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          installScript,
          "-ScriptPath",
          blockerScript,
        ],
        { detached: true, stdio: "ignore" },
      ).unref();
    },
  );
}

function ensureUserDb(): string {
  const userDataDir = app.getPath("userData");
  mkdirSync(userDataDir, { recursive: true });
  const dbPath = path.join(userDataDir, "dev.db");
  if (!existsSync(dbPath)) {
    const candidates = [
      path.join(process.resourcesPath ?? "", "seed.db"),
      path.join(app.getAppPath(), "prisma", "dev.db"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        copyFileSync(candidate, dbPath);
        break;
      }
    }
  }
  if (!existsSync(dbPath)) {
    throw new Error(
      `Seed database not found. Expected a bundled seed.db or prisma/dev.db before creating ${dbPath}.`,
    );
  }
  return dbPath;
}

function sqliteFileUrl(dbPath: string): string {
  return `file:${dbPath.replace(/\\/g, "/")}`;
}

async function startNextServer(): Promise<ServerInfo> {
  const port = await pickPort();
  const serverPath = resolveStandaloneServer();

  if (!existsSync(serverPath)) {
    throw new Error(
      `Standalone server not found at ${serverPath} — run \`pnpm build\` first.`,
    );
  }

  const dbPath = ensureUserDb();
  const token = ensureBlockerConfig(port);
  const nodeRuntime = resolveNodeRuntime();

  // Capture child stdout/stderr to a log file so we can debug packaged-app
  // failures (otherwise we'd silently never see them).
  const logDir = app.getPath("userData");
  mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "next-server.log");
  appendFileSync(
    logPath,
    `\n\n===== ${new Date().toISOString()} starting server =====\n` +
      `serverPath=${serverPath}\n` +
      `dbPath=${dbPath}\n` +
      `port=${port}\n` +
      `nodeRuntime=${nodeRuntime.exePath}\n` +
      `execPath=${process.execPath}\n`,
  );

  nextProcess = spawn(nodeRuntime.exePath, [serverPath], {
    env: {
      ...process.env,
      ...(nodeRuntime.electronRunAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: sqliteFileUrl(dbPath),
      LIFE_OS_API_TOKEN: token,
      LIFE_OS_RESOURCES_DIR: resolveResourcesDir(),
      LIFE_OS_USER_DATA_DIR: app.getPath("userData"),
    },
    cwd: path.dirname(serverPath),
    stdio: ["ignore", "pipe", "pipe"],
  });

  nextProcess.stdout?.on("data", (chunk: Buffer) => {
    appendFileSync(logPath, `[out] ${chunk.toString()}`);
  });
  nextProcess.stderr?.on("data", (chunk: Buffer) => {
    appendFileSync(logPath, `[err] ${chunk.toString()}`);
  });

  ensureBlockerInstalled();

  // Use a ref-like object so TS doesn't narrow the value after init.
  const exitRef: { value: { code: number | null; signal: string | null } | null } = {
    value: null,
  };
  nextProcess.on("exit", (code, signal) => {
    exitRef.value = { code, signal };
    appendFileSync(
      logPath,
      `[exit] code=${code} signal=${signal}\n`,
    );
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  try {
    await waitForReady(port, 60_000);
  } catch (err) {
    let tail = "";
    try {
      const all = readFileSync(logPath, "utf8");
      tail = all.slice(-2000);
    } catch {}
    const detail = exitRef.value
      ? `Child exited with code=${exitRef.value.code} signal=${exitRef.value.signal}`
      : `Child still running but not listening on port ${port}`;
    throw new Error(
      `${err instanceof Error ? err.message : String(err)}\n${detail}\n\n--- next-server.log tail ---\n${tail}`,
    );
  }
  return { url: `http://127.0.0.1:${port}`, token };
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: "Life OS",
    backgroundColor: "#fafaf7",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Only start hidden if Windows passed --hidden via the auto-launch arg.
  // First-launch-after-install and manual launches always show the window.
  const startHidden =
    process.argv.includes("--hidden") &&
    app.getLoginItemSettings({ args: ["--hidden"] }).wasOpenedAsHidden;
  mainWindow.once("ready-to-show", () => {
    if (!startHidden) {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Closing the window hides it instead of quitting — tray icon stays alive.
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  await mainWindow.loadURL(targetUrl);
}

function navigate(routePath: string) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow().then(() => navigate(routePath));
    return;
  }
  mainWindow.show();
  mainWindow.focus();
  mainWindow.loadURL(`${targetUrl}${routePath}`);
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Open Life OS", click: () => navigate("/today") },
    { type: "separator" },
    { label: "Today", click: () => navigate("/today") },
    { label: "Week", click: () => navigate("/week") },
    { label: "Habits", click: () => navigate("/habits") },
    { label: "Identity", click: () => navigate("/identity") },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function resolveTrayIcon(): Electron.NativeImage {
  // The icon lives next to the compiled main.js once Electron is bundled, and
  // alongside the source in dev. Probe both.
  const candidates = [
    path.join(__dirname, "tray.png"), // packaged: electron-dist/tray.png
    path.join(app.getAppPath(), "electron", "tray.png"), // dev: electron/tray.png
    path.join(process.resourcesPath ?? "", "tray.png"), // extraResources fallback
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const img = nativeImage.createFromPath(candidate);
      if (!img.isEmpty()) return img;
    }
  }
  // Last-resort generated 16x16 sage square so the tray is never invisible.
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 124; // R sage
    buf[i + 1] = 140; // G
    buf[i + 2] = 107; // B
    buf[i + 3] = 255; // A
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createTray() {
  tray = new Tray(resolveTrayIcon());
  tray.setToolTip("Life OS");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => navigate("/today"));
  tray.on("double-click", () => navigate("/today"));
}

type PendingNotification = {
  slug: string;
  title: string;
  body: string;
  route?: string;
};

let notificationToken = "";
let notificationTimer: NodeJS.Timeout | null = null;

async function pollNotifications() {
  if (!targetUrl || !notificationToken) return;
  try {
    const res = await fetch(`${targetUrl}/api/v1/notifications/check`, {
      headers: { "X-Life-OS-Token": notificationToken },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { notifications?: PendingNotification[] };
    for (const n of data.notifications ?? []) {
      showToast(n);
    }
  } catch {
    // Server transient unavailable — ignore.
  }
}

function showToast(n: PendingNotification) {
  if (!Notification.isSupported()) return;
  const toast = new Notification({
    title: n.title,
    body: n.body,
    silent: false,
  });
  toast.on("click", () => {
    navigate(n.route ?? "/today");
  });
  toast.show();
}

function fatalLog(err: unknown) {
  try {
    const dir = app.getPath("userData");
    mkdirSync(dir, { recursive: true });
    const line = `${new Date().toISOString()} ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`;
    appendFileSync(path.join(dir, "error.log"), line);
  } catch {
    // last-resort: stderr
    console.error(err);
  }
}

process.on("uncaughtException", fatalLog);
process.on("unhandledRejection", fatalLog);

app.whenReady().then(async () => {
  try {
    if (isDev) {
      targetUrl = DEV_URL!;
      notificationToken = process.env.LIFE_OS_API_TOKEN ?? "";
    } else {
      const server = await startNextServer();
      targetUrl = server.url;
      notificationToken = server.token;
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        args: ["--hidden"],
      });
    }

    await createWindow();
    createTray();

    // First poll right after launch, then every 5 minutes.
    setTimeout(pollNotifications, 3_000);
    notificationTimer = setInterval(pollNotifications, 5 * 60 * 1000);

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  } catch (err) {
    fatalLog(err);
    // Show a clearly visible error window so the user isn't stranded with an
    // invisible app like before.
    const errWindow = new BrowserWindow({
      width: 720,
      height: 420,
      title: "Life OS — startup error",
      backgroundColor: "#fafaf7",
    });
    const msg = err instanceof Error ? err.message : String(err);
    errWindow.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<html><body style="font-family:system-ui;padding:32px;color:#1a1814;background:#fafaf7"><h1 style="font-weight:500">Life OS couldn't start</h1><pre style="white-space:pre-wrap;background:#fff;padding:12px;border:1px solid #ddd;border-radius:8px">${msg.replace(/</g, "&lt;")}</pre><p>See <code>%APPDATA%\\life-os\\error.log</code> for the full trace.</p></body></html>`,
        ),
    );
  }
});

app.on("window-all-closed", () => {
  // Don't quit when window closes — the tray is the persistent UI.
  // (On Windows, the default is to quit; we override by simply not calling
  // app.quit(). The window's close handler already hides the window instead
  // of destroying it, so this event normally won't fire — but if it does,
  // we deliberately stay alive.)
});

app.on("before-quit", () => {
  isQuitting = true;
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }
});
