import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const resolvedConfirmLabel = confirmLabel ?? t("confirmDialog.confirmDefault");
  const resolvedCancelLabel = cancelLabel ?? t("confirmDialog.cancelDefault");

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            {resolvedCancelLabel}
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
