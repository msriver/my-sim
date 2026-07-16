import { ipcMain } from "electron";
import {
  listIssues,
  createIssue,
  updateIssue,
  setStatus,
  deleteIssue,
  restoreIssue,
  addComment,
} from "../../issues/store.js";
import type { IssuePriority, IssueStatus } from "../../issues/types.js";

export function registerIssueHandlers(): void {
  ipcMain.handle("issues:list", () => {
    console.log("[ipc] issues:list");
    return listIssues();
  });

  ipcMain.handle("issues:listDeleted", () => {
    console.log("[ipc] issues:listDeleted");
    return listIssues({ includeDeleted: true }).filter((issue) => issue.deleted);
  });

  ipcMain.handle(
    "issues:create",
    (_event, input: { title: string; body: string; priority: IssuePriority }) => {
      console.log(`[ipc] issues:create "${input.title}"`);
      return createIssue(input);
    }
  );

  ipcMain.handle(
    "issues:update",
    (
      _event,
      id: string,
      changes: { title: string; body: string; priority: IssuePriority; targetProject?: string }
    ) => {
      console.log(`[ipc] issues:update ${id} "${changes.title}"`);
      return updateIssue(id, changes);
    }
  );

  ipcMain.handle("issues:setStatus", (_event, id: string, status: IssueStatus) => {
    console.log(`[ipc] issues:setStatus ${id} -> ${status}`);
    return setStatus(id, status);
  });

  ipcMain.handle("issues:delete", (_event, id: string) => {
    console.log(`[ipc] issues:delete ${id} (soft)`);
    return deleteIssue(id);
  });

  ipcMain.handle("issues:restore", (_event, id: string) => {
    console.log(`[ipc] issues:restore ${id}`);
    return restoreIssue(id);
  });

  ipcMain.handle("issues:addComment", (_event, id: string, body: string) => {
    console.log(`[ipc] issues:addComment ${id}`);
    return addComment(id, body);
  });
}
