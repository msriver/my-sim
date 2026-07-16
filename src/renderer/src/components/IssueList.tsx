import React from "react";
import { useTranslation } from "react-i18next";
import type { Issue } from "../../../issues/types";

interface Props {
  issues: Issue[];
  selectedId: string | null;
  runningIds: string[];
  onSelect: (id: string) => void;
}

export function IssueList({ issues, selectedId, runningIds, onSelect }: Props) {
  const { t } = useTranslation();

  if (issues.length === 0) {
    return <div className="issue-list-empty">{t("issueList.empty")}</div>;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLLIElement>, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
    }
  }

  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className={`issue-row ${issue.id === selectedId ? "selected" : ""}`}
          role="button"
          tabIndex={0}
          aria-pressed={issue.id === selectedId}
          onClick={() => onSelect(issue.id)}
          onKeyDown={(e) => handleKeyDown(e, issue.id)}
        >
          <span className={`status-dot status-${issue.status}`} aria-hidden="true" />
          <span className="issue-title" title={issue.title}>
            {issue.title}
          </span>
          {runningIds.includes(issue.id) && (
            <span className="running-badge">{t("issueList.running")}</span>
          )}
          <span className={`priority-badge priority-${issue.priority}`}>
            {t(`common.priority.${issue.priority}`)}
          </span>
          <span className={`issue-status-label status-${issue.status}`}>
            {t(`common.status.${issue.status}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
