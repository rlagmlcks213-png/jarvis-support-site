"use client";

import { useState, type ReactNode } from "react";
import Modal from "./Modal";

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "확인",
  danger = true,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted">{children}</div>
    </Modal>
  );
}
