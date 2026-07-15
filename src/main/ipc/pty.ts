import { ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import { listIssues } from "../../issues/store.js";
import { startClaudeSession, writeToSession, resizeSession, killSession } from "../pty.js";

export function registerPtyHandlers(win: BrowserWindow): void {
  ipcMain.handle("pty:start", (_event, issueId: string) => {
    console.log(`[ipc] pty:start issue=${issueId}`);
    const issue = listIssues().find((i) => i.id === issueId);
    if (!issue) {
      console.log(`[ipc] pty:start failed - issue not found: ${issueId}`);
      throw new Error(`Issue not found: ${issueId}`);
    }
    return startClaudeSession(win, issue);
  });

  ipcMain.on("pty:write", (_event, issueId: string, data: string) => writeToSession(issueId, data));
  ipcMain.on("pty:resize", (_event, issueId: string, cols: number, rows: number) => {
    console.log(`[ipc] pty:resize ${issueId} ${cols}x${rows}`);
    resizeSession(issueId, cols, rows);
  });
  ipcMain.on("pty:kill", (_event, issueId: string) => {
    console.log(`[ipc] pty:kill ${issueId}`);
    killSession(issueId);
  });
}
