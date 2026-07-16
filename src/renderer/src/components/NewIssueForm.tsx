import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IssuePriority } from "../../../issues/types";

interface Props {
  onCancel: () => void;
  onSubmit: (input: { title: string; body: string; priority: IssuePriority }) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NewIssueForm({ onCancel, onSubmit, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isDirty = title.trim() !== "" || body.trim() !== "" || priority !== "medium";

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("common.titleRequired"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), priority });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("newIssueForm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-issue-form" onSubmit={handleSubmit}>
      <h2>{t("newIssueForm.heading")}</h2>
      <label>
        {t("newIssueForm.titleLabel")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        {t("newIssueForm.bodyLabel")}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </label>
      <label>
        {t("newIssueForm.priorityLabel")}
        <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
          <option value="low">{t("common.priority.low")}</option>
          <option value="medium">{t("common.priority.medium")}</option>
          <option value="high">{t("common.priority.high")}</option>
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button
          type="button"
          onClick={() => {
            console.log("[ui] 새 이슈 작성 취소");
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
