"use client";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] shadow-xl">
        <div className="p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          {message ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
          ) : null}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className={cx(
                "inline-flex items-center justify-center rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-button)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-list)]",
                "disabled:opacity-50",
              )}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={cx(
                "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition",
                "disabled:opacity-50",
                danger
                  ? "border border-[rgba(255,99,99,0.45)] bg-[var(--bg-page)] text-[var(--text-primary)] hover:bg-[var(--bg-list)]"
                  : "bg-[var(--bg-accent)] text-[var(--text-button)] hover:opacity-90",
              )}
            >
              {busy ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
