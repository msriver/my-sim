import React, { useEffect, useState } from "react";
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
      setError("제목을 입력해주세요.");
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
      setError(err instanceof Error ? err.message : "이슈를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-issue-form" onSubmit={handleSubmit}>
      <h2>이슈 수정</h2>
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
      <label>
        대상 프로젝트 (비워두면 기본값 사용)
        <div className="settings-path-row">
          <input
            value={targetProject}
            onChange={(e) => setTargetProject(e.target.value)}
            placeholder="기본값 사용"
          />
          <button type="button" onClick={handleSelectFolder}>
            폴더 선택
          </button>
        </div>
        {folderExists === false && <p className="form-warning">⚠ 해당 경로가 존재하지 않습니다.</p>}
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
          취소
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
