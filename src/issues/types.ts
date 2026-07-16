export type IssueStatus = "todo" | "in-progress" | "done";

export type IssuePriority = "low" | "medium" | "high";

export interface IssueComment {
  id: string;
  body: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  /** Overrides config.defaultTargetProject when launching Claude Code for this issue. */
  targetProject?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when status transitions to "done"; cleared when it transitions away. See setStatus(). */
  closedAt?: string;
  body: string;
  /** Soft-delete flag. The markdown file is kept on disk; listIssues() hides it by default. */
  deleted?: boolean;
  /** Free-form notes attached to the issue. Never fed into buildPrompt() - SIM-local only. */
  comments?: IssueComment[];
  /** Absolute path to the backing markdown file. */
  filePath: string;
}

export const ISSUE_STATUSES: IssueStatus[] = ["todo", "in-progress", "done"];
export const ISSUE_PRIORITIES: IssuePriority[] = ["low", "medium", "high"];
