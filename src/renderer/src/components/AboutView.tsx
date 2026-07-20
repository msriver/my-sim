import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UpdateCheckResult, UpdateInstallResult } from "../../../shared/ipc";

interface Props {
  onClose: () => void;
}

type UpdateState = "idle" | "checking" | "upToDate" | "available" | "downloading" | "readyToInstall" | "error";

const APP_NAME = "SIM";
const AUTHOR = "msriver";
const REPO_URL = "https://github.com/msriver/my-sim";

export function AboutView({ onClose }: Props) {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // "check" errors come from update.check() itself; "other" covers the streamed
  // download/quitAndInstall failures (update.onError) - each maps to a different i18n key.
  const [errorSource, setErrorSource] = useState<"check" | "other">("other");
  const [installBlockedCount, setInstallBlockedCount] = useState<number | null>(null);

  useEffect(() => {
    window.api.app.getVersion().then(setVersion);
  }, []);

  useEffect(() => {
    const offProgress = window.api.update.onProgress((percent) => {
      setProgress(percent);
    });
    const offDownloaded = window.api.update.onDownloaded(() => {
      console.log("[ui] 업데이트 다운로드 완료");
      setUpdateState("readyToInstall");
    });
    const offError = window.api.update.onError((message) => {
      console.log(`[ui] 업데이트 오류: ${message}`);
      setErrorMessage(message);
      setErrorSource("other");
      setUpdateState("error");
    });
    return () => {
      offProgress();
      offDownloaded();
      offError();
    };
  }, []);

  function handleClose() {
    console.log("[ui] 정보 닫기");
    onClose();
  }

  async function handleCheckUpdate() {
    console.log("[ui] \"업데이트 확인\" 클릭");
    setUpdateState("checking");
    setErrorMessage(null);
    try {
      const result = await window.api.update.check();
      setCheckResult(result);
      setUpdateState(result.hasUpdate ? "available" : "upToDate");
    } catch (err) {
      console.log(`[ui] 업데이트 확인 실패: ${err instanceof Error ? err.message : err}`);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setErrorSource("check");
      setUpdateState("error");
    }
  }

  function handleDownloadUpdate() {
    console.log("[ui] \"업데이트 하기\" 클릭");
    setProgress(0);
    setUpdateState("downloading");
    window.api.update.download();
  }

  // Single merged check/download button: label, handler, and disabled state all
  // derive from updateState. Returns null for readyToInstall, where this button
  // is hidden and the separate "재시작하여 설치" button below takes over.
  function getUpdateButton(): { label: string; onClick: () => void; disabled: boolean } | null {
    switch (updateState) {
      case "checking":
        return { label: t("about.checking"), onClick: handleCheckUpdate, disabled: true };
      case "available":
        return { label: t("about.proceedUpdate"), onClick: handleDownloadUpdate, disabled: false };
      case "downloading":
        return {
          label: t("about.downloading", { percent: Math.round(progress) }),
          onClick: handleDownloadUpdate,
          disabled: true
        };
      case "readyToInstall":
        return null;
      case "idle":
      case "upToDate":
      case "error":
      default:
        return { label: t("about.checkUpdate"), onClick: handleCheckUpdate, disabled: false };
    }
  }

  async function handleInstall() {
    console.log("[ui] \"재시작하여 설치\" 클릭");
    setInstallBlockedCount(null);
    try {
      const result: UpdateInstallResult = await window.api.update.install();
      if (result.status === "blocked") {
        console.log(`[ui] 업데이트 설치 차단됨 (실행 중인 세션 ${result.liveSessionCount}개)`);
        setInstallBlockedCount(result.liveSessionCount);
        setUpdateState("readyToInstall");
      }
      // status === "installing" -> the app is about to quit; nothing else to do here.
    } catch (err) {
      console.log(`[ui] 업데이트 설치 실패: ${err instanceof Error ? err.message : err}`);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setErrorSource("other");
      setUpdateState("error");
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>About</h2>
        <div className="about-info">
          <div>{APP_NAME}</div>
          {version && <div>Version: {version}</div>}
          <div>License: MIT</div>
          <div>
            Author: {AUTHOR} (
            <a target="_blank" rel="noreferrer" href={REPO_URL}>
              GitHub
            </a>
            )
          </div>
        </div>

        <div className="about-update">
          {(() => {
            const updateButton = getUpdateButton();
            return (
              updateButton && (
                <button type="button" onClick={updateButton.onClick} disabled={updateButton.disabled}>
                  {updateButton.label}
                </button>
              )
            );
          })()}

          {updateState === "upToDate" && <p>{t("about.upToDate")}</p>}

          {(updateState === "available" || updateState === "downloading" || updateState === "readyToInstall") &&
            checkResult && (
              <p>
                {t("about.updateAvailable", { latestVersion: checkResult.latestVersion })}{" "}
                <a target="_blank" rel="noreferrer" href={checkResult.releaseUrl}>
                  {t("about.releaseNotesLink")}
                </a>
              </p>
            )}

          {updateState === "error" && errorMessage && (
            <p className="form-error">
              {t(errorSource === "check" ? "about.checkFailed" : "about.installError", { message: errorMessage })}
            </p>
          )}

          {updateState === "readyToInstall" && (
            <>
              <p>{t("about.readyToInstall")}</p>
              <button type="button" className="primary" onClick={handleInstall}>
                {t("about.restartAndInstall")}
              </button>
              {installBlockedCount !== null && (
                <p className="form-error">
                  {t("about.installBlocked", { liveSessionCount: installBlockedCount })}
                </p>
              )}
            </>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleClose}>
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
