import "server-only";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export type BlockerInstallStatus = {
  supported: boolean;
  registered: boolean;
  message: string;
};

const TASK_NAME = "LifeOS-Blocker";

function execFileAsync(
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function resourceDirCandidates(): string[] {
  const envDir = process.env.LIFE_OS_RESOURCES_DIR;
  return [
    envDir ?? "",
    path.join(process.cwd(), "resources"),
    path.resolve(process.cwd(), "..", "..", "resources"),
  ].filter(Boolean);
}

function resolveResourceScript(name: string): string | null {
  for (const dir of resourceDirCandidates()) {
    const candidate = path.join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function getBlockerInstallStatus(): Promise<BlockerInstallStatus> {
  if (process.platform !== "win32") {
    return {
      supported: false,
      registered: false,
      message: "The privileged blocker is only available on Windows.",
    };
  }

  try {
    await execFileAsync("schtasks.exe", ["/Query", "/TN", TASK_NAME]);
    return {
      supported: true,
      registered: true,
      message: "The privileged blocker scheduled task is registered.",
    };
  } catch {
    return {
      supported: true,
      registered: false,
      message: "The privileged blocker scheduled task is not registered.",
    };
  }
}

export async function requestBlockerInstall(): Promise<void> {
  if (process.platform !== "win32") {
    throw new Error("The privileged blocker is only available on Windows.");
  }

  const installScript = resolveResourceScript("install-blocker.ps1");
  const blockerScript = resolveResourceScript("blocker.ps1");
  if (!installScript || !blockerScript) {
    throw new Error("Could not find bundled blocker installer scripts.");
  }

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
}
