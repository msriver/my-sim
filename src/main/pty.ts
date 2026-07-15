import * as pty from "node-pty";
import type { BrowserWindow } from "electron";
import type { Issue } from "../issues/types.js";
import { loadConfig, resolveTargetProject } from "../config.js";
import { claudeCommand, buildPrompt } from "../claude/launcher.js";

interface Session {
  issueId: string;
  issueTitle: string;
  targetProject: string;
  ptyProcess: pty.IPty;
}

/** Live sessions keyed by issue id. Only one session per resolved target project is allowed. */
const sessions = new Map<string, Session>();

export type StartResult =
  | { status: "started"; targetProject: string }
  | { status: "busy"; targetProject: string; busyIssueId: string; busyIssueTitle: string };

export function startClaudeSession(win: BrowserWindow, issue: Issue): StartResult {
  const config = loadConfig();
  const targetProject = resolveTargetProject(config, issue.targetProject);

  const existing = sessions.get(issue.id);
  if (existing) {
    return { status: "started", targetProject: existing.targetProject };
  }

  const busy = [...sessions.values()].find((s) => s.targetProject === targetProject);
  if (busy) {
    return { status: "busy", targetProject, busyIssueId: busy.issueId, busyIssueTitle: busy.issueTitle };
  }

  const prompt = buildPrompt(issue);
  const command = claudeCommand();

  console.log(`[pty] spawning "${command}" in "${targetProject}" for issue ${issue.id}`);

  const ptyProcess = pty.spawn(command, [prompt], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: targetProject,
    env: process.env as Record<string, string>,
  });

  const session: Session = { issueId: issue.id, issueTitle: issue.title, targetProject, ptyProcess };
  sessions.set(issue.id, session);

  // Defensive identity check (mirrors the old single-session design's activeProcess ===
  // ptyProcess guard): protects against a stale session's callbacks acting on a
  // since-replaced map entry. `killSession` deliberately does NOT delete this entry itself -
  // only this onExit handler does, once the process has actually died - so this check stays
  // accurate for a manual kill too, not just a natural exit.
  ptyProcess.onData((data) => {
    if (sessions.get(issue.id) !== session) return;
    win.webContents.send("pty:data", issue.id, data);
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`[pty] issue ${issue.id} exited (code=${exitCode}, signal=${signal})`);
    if (sessions.get(issue.id) !== session) return;
    sessions.delete(issue.id);
    win.webContents.send("pty:exit", issue.id, { exitCode, signal });
  });

  return { status: "started", targetProject };
}

export function writeToSession(issueId: string, data: string): void {
  sessions.get(issueId)?.ptyProcess.write(data);
}

export function resizeSession(issueId: string, cols: number, rows: number): void {
  sessions.get(issueId)?.ptyProcess.resize(cols, rows);
}

export function killSession(issueId: string): void {
  // Don't delete the map entry here - kill() is async (the process dies later), and this
  // entry's removal (plus the pty:exit notification) must stay in onExit's identity-checked
  // handler above, or a manual kill's exit event gets silently swallowed as "stale".
  sessions.get(issueId)?.ptyProcess.kill();
}

export function killAllSessions(): void {
  for (const session of sessions.values()) session.ptyProcess.kill();
  sessions.clear();
}
