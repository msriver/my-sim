import React, { useEffect, useState } from "react";

interface Props {
  targetProject: string;
  onSave: (path: string) => Promise<void>;
  onClose: () => void;
}

export function SettingsView({ targetProject, onSave, onClose }: Props) {
  const [path, setPath] = useState(targetProject);
  const [folderExists, setFolderExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const trimmed = path.trim();
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
  }, [path]);

  async function handleSelectFolder() {
    console.log("[ui] 환경설정 - 폴더 선택 클릭");
    const selected = await window.api.config.selectFolder();
    if (selected) setPath(selected);
  }

  async function handleSave() {
    if (!path.trim()) {
      setError("경로를 입력해주세요.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(path.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    console.log("[ui] 환경설정 닫기");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>환경설정</h2>
        <label>
          기본 프로젝트 폴더 (Claude Code 실행 폴더)
          <div className="settings-path-row">
            <input value={path} onChange={(e) => setPath(e.target.value)} />
            <button type="button" onClick={handleSelectFolder}>
              폴더 선택
            </button>
          </div>
          {folderExists === false && <p className="form-warning">⚠ 해당 경로가 존재하지 않습니다.</p>}
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={handleClose}>
            취소
          </button>
          <button type="button" className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
