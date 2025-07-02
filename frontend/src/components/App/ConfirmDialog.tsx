/** @jsxImportSource @emotion/react */
import {
  confirmDialogStyle,
  confirmDialogContentStyle,
  confirmDialogTitleStyle,
  confirmDialogMessageStyle,
  confirmDialogButtonsStyle,
  buttonStyle,
} from "./AppStyles";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div css={confirmDialogStyle}>
      <div css={confirmDialogContentStyle}>
        <h3 css={confirmDialogTitleStyle}>{title}</h3>
        <p css={confirmDialogMessageStyle}>{message}</p>
        <div css={confirmDialogButtonsStyle}>
          <button
            css={buttonStyle(false)}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            css={buttonStyle(true)}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
