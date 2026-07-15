import type { Issue } from "../issues/types.js";

export function claudeCommand(): string {
  return process.platform === "win32" ? "claude.exe" : "claude";
}

export function buildPrompt(issue: Issue): string {
  return `${issue.title}\n\n${issue.body}`.trim();
}
