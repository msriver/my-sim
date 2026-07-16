import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Issue, IssuePriority } from "../../../issues/types";

interface Props {
  issue: Issue;
  onCancel: () => void;
  onSubmit: (changes: {
    title: string;
    body: string;
    priority: IssuePriority;
    targetProject?: string;
  }) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

export function EditIssueForm({ issue, onCancel, onSubmit, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(issue.title);
  const [body, setBody] = useState(issue.body);
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [targetProject, setTargetProject] = useState(issue.targetProject ?? "");
  const [folderExists, setFolderExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isDirty =
    title.trim() !== issue.title ||
    body.trim() !== issue.body ||
    priority !== issue.priority ||
    targetProject.trim() !== (issue.targetProject ?? "");

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const trimmed = targetProject.trim();
    if (!trimmed) {
      setFolderExists(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const exists = await window.api.config.folderExists(trimmed);
      if (!cancelled) setFolderExists(exists);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [targetProject]);

  async function handleSelectFolder() {
    console.log("[ui] 이슈 수정 - 폴더 선택 클릭");
    const selected = await window.api.config.selectFolder();
    if (selected) setTargetProject(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("common.titleRequired"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        priority,
        targetProject: targetProject.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editIssueForm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-issue-form" onSubmit={handleSubmit}>
      <h2>{t("editIssueForm.heading")}</h2>
      <label>
        {t("editIssueForm.titleLabel")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        {t("editIssueForm.bodyLabel")}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </label>
      <label>
        {t("editIssueForm.priorityLabel")}
        <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
          <option value="low">{t("common.priority.low")}</option>
          <option value="medium">{t("common.priority.medium")}</option>
          <option value="high">{t("common.priority.high")}</option>
        </select>
      </label>
      <label>
        {t("editIssueForm.targetProjectLabel")}
        <div className="settings-path-row">
          <input
            value={targetProject}
            onChange={(e) => setTargetProject(e.target.value)}
            placeholder={t("editIssueForm.targetProjectPlaceholder")}
          />
          <button type="button" onClick={handleSelectFolder}>
            {t("common.selectFolder")}
          </button>
        </div>
        {folderExists === false && <p className="form-warning">{t("common.folderNotFound")}</p>}
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button
          type="button"
          onClick={() => {
            console.log("[ui] 이슈 수정 취소");
            onCancel();
          }}
        >
          {t("common.cancel")}
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
