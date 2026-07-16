import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IssueComment } from "../../../issues/types";

interface Props {
  comments: IssueComment[] | undefined;
  onAddComment: (body: string) => Promise<void>;
}

export function IssueComments({ comments, onAddComment }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Newest first - confirmed user decision (see docs/stories/11 story file).
  const sorted = [...(comments ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    setSaving(true);
    try {
      await onAddComment(trimmed);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("issueComments.addFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="issue-comments">
      <h3 className="issue-comments-heading">{t("issueComments.heading")}</h3>
      <form className="issue-comments-form" onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("issueComments.placeholder")}
          rows={3}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving || !body.trim()}>
            {saving ? t("issueComments.adding") : t("issueComments.addButton")}
          </button>
        </div>
      </form>
      {sorted.length === 0 ? (
        <p className="issue-comments-empty">{t("issueComments.empty")}</p>
      ) : (
        <ul className="issue-comments-list">
          {sorted.map((comment) => (
            <li key={comment.id} className="issue-comments-item">
              <p className="issue-comments-item-body">{comment.body}</p>
              <span className="issue-comments-item-date">
                {new Date(comment.createdAt).toLocaleString(dateLocale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
