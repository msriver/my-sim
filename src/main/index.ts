import { app, BrowserWindow, shell, dialog } from "electron";
import fs from "node:fs";
import { join } from "node:path";
import { registerIssueHandlers } from "./ipc/issues.js";
import { registerPtyHandlers } from "./ipc/pty.js";
import { registerConfigHandlers } from "./ipc/config.js";
import { killAllSessions } from "./pty.js";
import { loadConfig, saveConfig } from "../config.js";

// react-i18next only runs in the renderer - this dialog is opened directly from the main
// process before any window exists, so it can't reach that instance. Just two strings, so a
// tiny inline map (keyed by the persisted config.language) is enough; see docs/stories/
// 10-i18n-국제화-구조-적용-story.md section 3.5 for why a second i18next instance was rejected.
const SELECT_FOLDER_DIALOG_TITLE = {
  ko: "Claude Code를 실행할 기본 프로젝트 폴더 선택",
  en: "Select the default project folder to run Claude Code in",
};

/**
 * On startup (first run, or if the configured folder was moved/deleted since), the
 * default target project won't exist on disk yet. Prompt for a real folder before the
 * window opens rather than silently launching Claude Code against a bad path later.
 */
async function ensureTargetProjectConfigured(): Promise<void> {
  const config = loadConfig();
  if (fs.existsSync(config.defaultTargetProject)) return;

  console.log(`[main] default target project not found: "${config.defaultTargetProject}" - prompting for folder`);
  const result = await dialog.showOpenDialog({
    title: SELECT_FOLDER_DIALOG_TITLE[config.language],
    properties: ["openDirectory"],
  });
  if (!result.canceled && result.filePaths[0]) {
    saveConfig({ ...config, defaultTargetProject: result.filePaths[0] });
    console.log(`[main] default target project set to "${result.filePaths[0]}"`);
  } else {
    console.log("[main] folder selection cancelled - fix later via 환경설정 in the app");
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Mirror renderer console.log/warn/error into this terminal so UI
  // interactions are visible next to the main-process [ipc]/[pty] logs.
  win.webContents.on("console-message", (_event, _level, message) => {
    console.log(`[renderer] ${message}`);
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Issue bodies render as markdown and may contain links; without this, clicking one
  // navigates the whole BrowserWindow away from the app instead of opening in a browser.
  win.webContents.on("will-navigate", (event, url) => {
    if (url === win.webContents.getURL()) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  registerPtyHandlers(win);
  registerConfigHandlers(win);
}

app.whenReady().then(async () => {
  registerIssueHandlers();
  await ensureTargetProjectConfigured();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Sessions now persist across navigation by design (multi-session), so nothing else kills
// them on the way out - without this they'd be orphaned once the app process exits.
app.on("before-quit", () => {
  killAllSessions();
});
