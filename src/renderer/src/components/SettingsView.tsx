import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Config } from "../../../shared/ipc";

interface Props {
  targetProject: string;
  language: Config["language"];
  onSave: (config: { defaultTargetProject: string; language: Config["language"] }) => Promise<void>;
  onClose: () => void;
}

export function SettingsView({ targetProject, language, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const [path, setPath] = useState(targetProject);
  const [selectedLanguage, setSelectedLanguage] = useState<Config["language"]>(language);
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
      setError(t("settings.pathRequired"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ defaultTargetProject: path.trim(), language: selectedLanguage });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveFailed"));
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
        <h2>{t("settings.heading")}</h2>
        <label>
          {t("settings.targetProjectLabel")}
          <div className="settings-path-row">
            <input value={path} onChange={(e) => setPath(e.target.value)} />
            <button type="button" onClick={handleSelectFolder}>
              {t("common.selectFolder")}
            </button>
          </div>
          {folderExists === false && <p className="form-warning">{t("common.folderNotFound")}</p>}
        </label>
        <label>
          {t("settings.languageLabel")}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as Config["language"])}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={handleClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
