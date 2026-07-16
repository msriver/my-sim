import { ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import { checkForUpdate, downloadUpdate, installUpdate } from "../update.js";

export function registerUpdateHandlers(win: BrowserWindow): void {
  ipcMain.handle("update:check", async () => {
    console.log("[ipc] update:check");
    const result = await checkForUpdate();
    console.log(
      `[ipc] update:check result - current=${result.currentVersion} latest=${result.latestVersion} hasUpdate=${result.hasUpdate}`
    );
    return result;
  });

  ipcMain.on("update:download", () => {
    console.log("[ipc] update:download");
    downloadUpdate(win);
  });

  ipcMain.handle("update:install", () => {
    console.log("[ipc] update:install");
    return installUpdate();
  });
}
