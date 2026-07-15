import React, { useEffect, useState } from "react";
import type { IssuePriority } from "../../../issues/types";

interface Props {
  onCancel: () => void;
  onSubmit: (input: { title: string; body: string; priority: IssuePriority }) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NewIssueForm({ onCancel, onSubmit, onDirtyChange }: Props) {
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
      setError("제목을 입력해주세요.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), priority });
    } catch (err) {
      setError(err instanceof Error ? err.message : "이슈를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-issue-form" onSubmit={handleSubmit}>
      <h2>새 이슈 만들기</h2>
      <label>
        제목
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        내용
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </label>
      <label>
        우선순위
        <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
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
          취소
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
