import { ipcMain, dialog } from "electron";
import type { BrowserWindow } from "electron";
import { loadConfig, saveConfig, pathExists } from "../../config.js";
import type { Config } from "../../shared/ipc.js";

// This dialog is opened directly from the main process, which react-i18next never reaches -
// see src/main/index.ts's SELECT_FOLDER_DIALOG_TITLE for the same pattern/rationale.
const SELECT_FOLDER_DIALOG_TITLE = {
  ko: "대상 프로젝트 폴더 선택",
  en: "Select target project folder",
};

export function registerConfigHandlers(win: BrowserWindow): void {
  ipcMain.handle("config:get", () => {
    console.log("[ipc] config:get");
    return loadConfig();
  });

  ipcMain.handle("config:set", (_event, config: Config) => {
    console.log(
      `[ipc] config:set defaultTargetProject="${config.defaultTargetProject}" language="${config.language}"`
    );
    saveConfig(config);
    return config;
  });

  ipcMain.handle("config:selectFolder", async () => {
    console.log("[ipc] config:selectFolder");
    const { language } = loadConfig();
    const result = await dialog.showOpenDialog(win, {
      title: SELECT_FOLDER_DIALOG_TITLE[language],
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
