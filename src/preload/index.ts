import { contextBridge, ipcRenderer } from "electron";
import type { Api, PtyExitInfo } from "../shared/ipc.js";

const api: Api = {
  issues: {
    list: () => ipcRenderer.invoke("issues:list"),
    listDeleted: () => ipcRenderer.invoke("issues:listDeleted"),
    create: (input) => ipcRenderer.invoke("issues:create", input),
    update: (id, changes) => ipcRenderer.invoke("issues:update", id, changes),
    setStatus: (id, status) => ipcRenderer.invoke("issues:setStatus", id, status),
    delete: (id) => ipcRenderer.invoke("issues:delete", id),
    restore: (id) => ipcRenderer.invoke("issues:restore", id),
  },
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    set: (config) => ipcRenderer.invoke("config:set", config),
    selectFolder: () => ipcRenderer.invoke("config:selectFolder"),
    folderExists: (path) => ipcRenderer.invoke("config:folderExists", path),
  },
  pty: {
    start: (issueId) => ipcRenderer.invoke("pty:start", issueId),
    write: (issueId, data) => ipcRenderer.send("pty:write", issueId, data),
    resize: (issueId, cols, rows) => ipcRenderer.send("pty:resize", issueId, cols, rows),
    kill: (issueId) => ipcRenderer.send("pty:kill", issueId),
    onData: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, issueId: string, data: string) =>
        callback(issueId, data);
      ipcRenderer.on("pty:data", listener);
      return () => ipcRenderer.removeListener("pty:data", listener);
    },
    onExit: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, issueId: string, info: PtyExitInfo) =>
        callback(issueId, info);
      ipcRenderer.on("pty:exit", listener);
      return () => ipcRenderer.removeListener("pty:exit", listener);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
