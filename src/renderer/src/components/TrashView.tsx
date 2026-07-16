import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Issue } from "../../../issues/types";

interface Props {
  onRestore: (issue: Issue) => Promise<void>;
  onClose: () => void;
}

export function TrashView({ onRestore, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const [deletedIssues, setDeletedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await window.api.issues.listDeleted();
      if (!cancelled) {
        setDeletedIssues(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRestoreClick(issue: Issue) {
    console.log(`[ui] 휴지통 - 복구 클릭: "${issue.title}"`);
    setError(null);
    setRestoringId(issue.id);
    try {
      await onRestore(issue);
      setDeletedIssues((prev) => prev.filter((i) => i.id !== issue.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trash.restoreFailed"));
    } finally {
      setRestoringId(null);
    }
  }

  function handleClose() {
    console.log("[ui] 휴지통 닫기");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{t("trash.heading")}</h2>
        {loading && <p className="empty-state">{t("trash.loading")}</p>}
        {!loading && deletedIssues.length === 0 && (
          <p className="empty-state">{t("trash.empty")}</p>
        )}
        {!loading && deletedIssues.length > 0 && (
          <ul className="trash-list">
            {deletedIssues.map((issue) => (
              <li key={issue.id} className="trash-row">
                <span className="trash-title" title={issue.title}>
                  {issue.title}
                </span>
                <span className="trash-date">
                  {new Date(issue.updatedAt).toLocaleString(dateLocale)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRestoreClick(issue)}
                  disabled={restoringId === issue.id}
                >
                  {restoringId === issue.id ? t("trash.restoring") : t("trash.restore")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={handleClose}>
            {t("trash.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
