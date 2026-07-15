import React from "react";
import { marked } from "marked";
import type { Issue, IssueStatus } from "../../../issues/types";

const PRIORITY_LABEL: Record<Issue["priority"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: "TODO",
  "in-progress": "IN PROGRESS",
  done: "DONE",
};

interface Props {
  issue: Issue;
  targetProject: string;
  /** Whether this issue currently has a *running* session (not just a past, exited one). */
  sessionLive: boolean;
  starting: boolean;
  onStatusChange: (status: IssueStatus) => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function IssueDetail({
  issue,
  targetProject,
  sessionLive,
  starting,
  onStatusChange,
  onRun,
  onEdit,
  onDelete,
}: Props) {
  const bodyHtml = issue.body ? marked.parse(issue.body, { async: false }) : "";

  return (
    <div className="issue-detail">
      <div className="issue-detail-header">
        <h2>{issue.title}</h2>
        <div className="issue-detail-actions">
          <select
            className="status-select"
            value={issue.status}
            onChange={(e) => onStatusChange(e.target.value as IssueStatus)}
          >
            <option value="todo">{STATUS_LABEL.todo}</option>
            <option value="in-progress">{STATUS_LABEL["in-progress"]}</option>
            <option value="done">{STATUS_LABEL.done}</option>
          </select>
          <button onClick={onEdit}>수정</button>
          <button onClick={onDelete}>삭제</button>
          <button className="primary" onClick={onRun} disabled={starting}>
            {starting ? "시작 중..." : sessionLive ? "터미널 보기" : "▶ Claude Code 실행"}
          </button>
        </div>
      </div>
      <div className="issue-detail-meta-card">
        <div className="issue-detail-meta-row">
          <span className="issue-detail-meta-id">[{issue.id}]</span>
          <span className="issue-detail-meta-priority">
            우선순위 {PRIORITY_LABEL[issue.priority]}
          </span>
        </div>
        <div className="issue-detail-meta-row issue-detail-meta-date">
          {new Date(issue.updatedAt).toLocaleString()}
        </div>
        <div className="issue-detail-target">
          <span className="issue-detail-target-label">대상 프로젝트</span>
          <span className="issue-detail-target-value">
            {issue.targetProject ?? `${targetProject} (기본값)`}
          </span>
        </div>
      </div>
      {issue.body ? (
        <div className="issue-detail-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <p className="issue-detail-body-empty">(내용 없음)</p>
      )}
    </div>
  );
}
