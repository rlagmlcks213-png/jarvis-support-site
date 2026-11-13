"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { errorMessage } from "@/lib/repository";

/** 글 비밀번호 확인 모달. onSubmit이 throw하면 오류 문구를 보여준다. */
export default function PasswordModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  danger,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPw("");
      setError("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) {
      setError("글 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(pw);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">{description ?? "글을 작성할 때 입력한 비밀번호를 입력해 주세요."}</p>
        <input
          type="password"
          className={`input ${error ? "input-error" : ""}`}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-label="글 비밀번호"
          aria-invalid={!!error}
          autoComplete="off"
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className={danger ? "btn-danger" : "btn-primary"} disabled={busy}>
            {busy ? "확인 중…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
