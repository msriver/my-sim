import React from "react";
import { marked } from "marked";
import { useTranslation } from "react-i18next";
import type { Issue, IssueStatus } from "../../../issues/types";
import { IssueComments } from "./IssueComments";

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
  onAddComment: (body: string) => Promise<void>;
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
  onAddComment,
}: Props) {
  const { t, i18n } = useTranslation();
  const bodyHtml = issue.body ? marked.parse(issue.body, { async: false }) : "";
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

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
            <option value="todo">🔵 {t("common.status.todo")}</option>
            <option value="in-progress">🟡 {t("common.status.in-progress")}</option>
            <option value="done">🟢 {t("common.status.done")}</option>
          </select>
          <button onClick={onEdit}>{t("issueDetail.edit")}</button>
          <button onClick={onDelete}>{t("issueDetail.delete")}</button>
          <button className="primary" onClick={onRun} disabled={starting}>
            {starting
              ? t("issueDetail.starting")
              : sessionLive
                ? t("issueDetail.viewTerminal")
                : t("issueDetail.runButton")}
          </button>
        </div>
      </div>
      <div className="issue-detail-meta-card">
        <div className="issue-detail-meta-row">
          <span className="issue-detail-meta-id">[{issue.id}]</span>
          <span className="issue-detail-meta-priority">
            {t("issueDetail.priorityLabel", { priority: t(`common.priority.${issue.priority}`) })}
          </span>
        </div>
        <div className="issue-detail-meta-row issue-detail-meta-date">
          {new Date(issue.updatedAt).toLocaleString(dateLocale)}
        </div>
        {issue.closedAt && (
          <div className="issue-detail-meta-row issue-detail-meta-date">
            {t("issueDetail.closedAtLabel", {
              date: new Date(issue.closedAt).toLocaleString(dateLocale),
            })}
          </div>
        )}
        <div className="issue-detail-target">
          <span className="issue-detail-target-label">{t("issueDetail.targetProject")}</span>
          <span className="issue-detail-target-value">
            {issue.targetProject ?? t("issueDetail.defaultSuffix", { targetProject })}
          </span>
        </div>
      </div>
      {issue.body ? (
        <div className="issue-detail-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <p className="issue-detail-body-empty">{t("issueDetail.noContent")}</p>
      )}
      <IssueComments comments={issue.comments} onAddComment={onAddComment} />
    </div>
  );
}
