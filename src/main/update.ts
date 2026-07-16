import { app } from "electron";
import type { BrowserWindow } from "electron";
// electron-updater ships as CommonJS; under this repo's "type": "module" + electron-vite's
// ESM main bundle, a named import (`import { autoUpdater } from "electron-updater"`) throws
// "Named export 'autoUpdater' not found" at runtime even though it type-checks fine - go
// through the default export instead.
import electronUpdater from "electron-updater";
import type { UpdateCheckResult, UpdateInstallResult } from "../shared/ipc.js";
import { liveSessionCount } from "./pty.js";

const { autoUpdater } = electronUpdater;

// Never download without an explicit "업데이트 하기" click, and never install silently on
// quit - both would bypass the live-session guard below and risk killing a running `claude`
// CLI process out from under the user (see CLAUDE.md's before-quit/killAllSessions constraint).
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let progressListenersRegistered = false;

/**
 * `download-progress`/`update-downloaded`/`error` listeners are registered once at module
 * load (not per call) so repeated `downloadUpdate` invocations don't stack duplicate
 * listeners - the `win` reference is captured from whichever call wires them up first, which
 * is fine since this app only ever has one window.
 */
function registerDownloadListeners(win: BrowserWindow): void {
  if (progressListenersRegistered) return;
  progressListenersRegistered = true;

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("update:progress", progress.percent);
  });
  autoUpdater.on("update-downloaded", () => {
    console.log("[update] update-downloaded");
    win.webContents.send("update:downloaded");
  });
  autoUpdater.on("error", (err) => {
    console.log(`[update] error: ${err.message}`);
    win.webContents.send("update:error", err.message);
  });
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion();
  const result = await autoUpdater.checkForUpdates();
  const latestVersion = result?.updateInfo.version ?? currentVersion;
  const hasUpdate = latestVersion !== currentVersion;
  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    releaseUrl: `https://github.com/msriver/my-sim/releases/tag/v${latestVersion}`,
  };
}

export function downloadUpdate(win: BrowserWindow): void {
  registerDownloadListeners(win);
  // Relies on checkForUpdate() having already populated autoUpdater's internal update-info
  // cache in this same run - the renderer only enables the "업데이트 하기" button after a
  // successful check, which naturally enforces this ordering.
  autoUpdater.downloadUpdate();
}

export function installUpdate(): UpdateInstallResult {
  const count = liveSessionCount();
  if (count > 0) {
    console.log(`[update] install blocked - ${count} live session(s)`);
    return { status: "blocked", liveSessionCount: count };
  }
  console.log("[update] quitAndInstall");
  autoUpdater.quitAndInstall(false, true);
  return { status: "installing", liveSessionCount: 0 };
}
