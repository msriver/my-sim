import type { Issue, IssuePriority, IssueStatus } from "../issues/types.js";

export interface Config {
  /** Absolute path to the project Claude Code should run in by default. */
  defaultTargetProject: string;
  /** UI language. Defaults to "en" when absent (see loadConfig in src/config.ts). */
  language: "ko" | "en";
}

export interface IssuesApi {
  list(): Promise<Issue[]>;
  /** Returns only soft-deleted issues (deleted: true), for the 휴지통/trash view. */
  listDeleted(): Promise<Issue[]>;
  create(input: { title: string; body: string; priority: IssuePriority }): Promise<Issue>;
  update(
    id: string,
    changes: { title: string; body: string; priority: IssuePriority; targetProject?: string }
  ): Promise<Issue>;
  setStatus(id: string, status: IssueStatus): Promise<Issue>;
  delete(id: string): Promise<Issue>;
  /** Clears the deleted flag, making the issue visible in list() again. */
  restore(id: string): Promise<Issue>;
  /** Appends a new comment to the issue and returns the updated Issue. */
  addComment(id: string, body: string): Promise<Issue>;
}

export interface ConfigApi {
  get(): Promise<Config>;
  set(config: Config): Promise<Config>;
  /** Opens a native folder-picker dialog. Resolves to null if the user cancels. */
  selectFolder(): Promise<string | null>;
  /** True if the given path exists on disk and is a directory. */
  folderExists(path: string): Promise<boolean>;
}

export interface PtyExitInfo {
  /**
   * node-pty's own type declares this as always a `number`, but a forceful kill (e.g. the
   * "세션 종료" button on Windows) has been observed to actually deliver `undefined` here -
   * this type is intentionally more permissive than node-pty's to match that reality.
   */
  exitCode?: number;
  signal?: number;
}

/**
 * `started`: a session for this issue is now running (or already was).
 * `busy`: another issue already holds a live session for the same resolved target project —
 * only one session per target project is allowed, so no new process was spawned.
 */
export type PtyStartResult =
  | { status: "started"; targetProject: string }
  | { status: "busy"; targetProject: string; busyIssueId: string; busyIssueTitle: string };

export interface PtyApi {
  start(issueId: string): Promise<PtyStartResult>;
  write(issueId: string, data: string): void;
  resize(issueId: string, cols: number, rows: number): void;
  kill(issueId: string): void;
  onData(callback: (issueId: string, data: string) => void): () => void;
  onExit(callback: (issueId: string, info: PtyExitInfo) => void): () => void;
}

export interface AppApi {
  getVersion(): Promise<string>;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
}

export interface UpdateInstallResult {
  status: "blocked" | "installing";
  liveSessionCount: number;
}

export interface UpdateApi {
  check(): Promise<UpdateCheckResult>;
  download(): void;
  install(): Promise<UpdateInstallResult>;
  onProgress(callback: (percent: number) => void): () => void;
  onDownloaded(callback: () => void): () => void;
  onError(callback: (message: string) => void): () => void;
}

export interface Api {
  issues: IssuesApi;
  config: ConfigApi;
  pty: PtyApi;
  app: AppApi;
  update: UpdateApi;
}
