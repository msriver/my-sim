import { app, ipcMain } from "electron";

export function registerAppHandlers(): void {
  ipcMain.handle("app:getVersion", () => {
    console.log("[ipc] app:getVersion");
    return app.getVersion();
  });
}
