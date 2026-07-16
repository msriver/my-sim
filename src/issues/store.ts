import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";
import type { Issue, IssuePriority, IssueStatus } from "./types.js";

export const ISSUES_DIR = path.resolve(process.cwd(), "issues");

function ensureIssuesDir(): void {
  fs.mkdirSync(ISSUES_DIR, { recursive: true });
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "issue";
}

function parseIssueFile(filePath: string): Issue {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    priority: data.priority,
    targetProject: data.targetProject,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    closedAt: data.closedAt,
    body: content.trim(),
    deleted: data.deleted,
    comments: data.comments,
    filePath,
  };
}

function writeIssueFile(issue: Issue): void {
  const { filePath, body, ...frontmatter } = issue;
  const cleanFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([, value]) => value !== undefined)
  );
  const file = matter.stringify(body, cleanFrontmatter);
  fs.writeFileSync(filePath, file, "utf-8");
}

export function listIssues(options?: { includeDeleted?: boolean }): Issue[] {
  ensureIssuesDir();
  const all = fs
    .readdirSync(ISSUES_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parseIssueFile(path.join(ISSUES_DIR, name)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return options?.includeDeleted ? all : all.filter((issue) => !issue.deleted);
}

export function createIssue(input: {
  title: string;
  body: string;
  priority: IssuePriority;
  targetProject?: string;
}): Issue {
  ensureIssuesDir();
  const id = uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  const filePath = path.join(ISSUES_DIR, `${id}-${slugify(input.title)}.md`);

  const issue: Issue = {
    id,
    title: input.title,
    status: "todo",
    priority: input.priority,
    targetProject: input.targetProject,
    createdAt: now,
    updatedAt: now,
    body: input.body,
    filePath,
  };

  writeIssueFile(issue);
  return issue;
}

export function updateIssue(
  id: string,
  changes: Partial<
    Pick<
      Issue,
      "title" | "status" | "priority" | "targetProject" | "body" | "deleted" | "closedAt" | "comments"
    >
  >
): Issue {
  const issue = listIssues({ includeDeleted: true }).find((i) => i.id === id);
  if (!issue) {
    throw new Error(`Issue not found: ${id}`);
  }
  const updated: Issue = {
    ...issue,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  writeIssueFile(updated);
  return updated;
}

export function setStatus(id: string, status: IssueStatus): Issue {
  const issue = listIssues({ includeDeleted: true }).find((i) => i.id === id);
  if (!issue) {
    throw new Error(`Issue not found: ${id}`);
  }
  const closedAt =
    status === "done" ? (issue.closedAt ?? new Date().toISOString()) : undefined;
  return updateIssue(id, { status, closedAt });
}

export function addComment(issueId: string, body: string): Issue {
  const issue = listIssues({ includeDeleted: true }).find((i) => i.id === issueId);
  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }
  const comment = {
    id: uuidv4().slice(0, 8),
    body,
    createdAt: new Date().toISOString(),
  };
  const comments = [...(issue.comments ?? []), comment];
  return updateIssue(issueId, { comments });
}

export function deleteIssue(id: string): Issue {
  return updateIssue(id, { deleted: true });
}

export function restoreIssue(id: string): Issue {
  return updateIssue(id, { deleted: false });
}
