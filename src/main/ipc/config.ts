import { ipcMain, dialog } from "electron";
import type { BrowserWindow } from "electron";
import { loadConfig, saveConfig, pathExists } from "../../config.js";
import type { Config } from "../../shared/ipc.js";

export function registerConfigHandlers(win: BrowserWindow): void {
  ipcMain.handle("config:get", () => {
    console.log("[ipc] config:get");
    return loadConfig();
  });

  ipcMain.handle("config:set", (_event, config: Config) => {
    console.log(`[ipc] config:set defaultTargetProject="${config.defaultTargetProject}"`);
    saveConfig(config);
    return config;
  });

  ipcMain.handle("config:selectFolder", async () => {
    console.log("[ipc] config:selectFolder");
    const result = await dialog.showOpenDialog(win, {
      title: "대상 프로젝트 폴더 선택",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("config:folderExists", (_event, rawPath: string) => {
    console.log(`[ipc] config:folderExists "${rawPath}"`);
    return pathExists(rawPath);
  });
}
