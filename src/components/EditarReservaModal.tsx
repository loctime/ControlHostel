"use client";

import { useState } from "react";
import type { Reserva } from "@/lib/db";
import { useHostel } from "@/context/HostelContext";

type Id = string;
export type ReservaNode = { id: Id; data: Reserva };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  return fallback;
}

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nightsBetween(checkin: Date, checkout: Date) {
  const a = new Date(checkin);
  const b = new Date(checkout);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = b.getTime() - a.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
        "focus:border-[var(--border-primary)]",
        props.className,
      )}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-xl bg-[var(--bg-accent)] px-4 py-2.5 text-sm font-medium text-[var(--text-button)] shadow-sm transition hover:opacity-90",
        "disabled:opacity-50",
        props.className,
      )}
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-button)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-list)]",
        "disabled:opacity-50",
        props.className,
      )}
    />
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar modal"
      />
      <div
        className="
          relative w-full max-w-xl rounded-2xl border border-[var(--border-secondary)]
          bg-[var(--bg-component)] shadow-xl
        "
      >
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] px-5 py-4">
          <div className="text-base font-semibold text-[var(--text-primary)]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-list)]"
          >
            Esc
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type Step = "datos" | "resumen";

export function EditarReservaModal({
  open,
  onClose,
  reserva,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  reserva: ReservaNode | null;
  onSuccess: () => void;
}) {
  const { hostelId } = useHostel();

  const [step, setStep] = useState<Step>("datos");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [notas, setNotas] = useState("");
  const [checkinYmd, setCheckinYmd] = useState("");
  const [checkoutYmd, setCheckoutYmd] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate fields when reserva changes or modal opens
  const prevReservaId = useState<string | null>(null)[0];
  if (open && reserva && reserva.id !== prevReservaId) {
    const h = reserva.data.huesped;
    // We use a ref-like trick: only set if fields are empty (first open)
    // Actually just rely on the effect below
  }

  // Reset and populate when modal opens with a different reserva
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);
  if (open && reserva && reserva.id !== lastOpenedId) {
    setLastOpenedId(reserva.id);
    setStep("datos");
    setError(null);
    const h = reserva.data.huesped;
    setNombre(h.nombre);
    setTelefono(h.telefono);
    setEmail(h.email);
    setDni(h.dni);
    setNotas(reserva.data.notas ?? "");
    setCheckinYmd(toYmd(reserva.data.checkin.toDate()));
    setCheckoutYmd(toYmd(reserva.data.checkout.toDate()));
  }

  if (!open || !reserva) return null;

  const checkinDate = parseYmd(checkinYmd);
  const checkoutDate = parseYmd(checkoutYmd);
  const nights =
    checkinDate && checkoutDate ? nightsBetween(checkinDate, checkoutDate) : 0;

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre del huésped es obligatorio.");
      return;
    }
    if (!checkinDate || !checkoutDate) {
      setError("Las fechas de check-in y check-out son obligatorias.");
      return;
    }
    if (checkoutDate <= checkinDate) {
      setError("El check-out debe ser posterior al check-in.");
      return;
    }
    setStep("resumen");
  }

  async function handleConfirm() {
    if (!hostelId || !reserva || !checkinDate || !checkoutDate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hostels/reservas/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          reservaId: reserva.id,
          checkinMillis: checkinDate.getTime(),
          checkoutMillis: checkoutDate.getTime(),
          huesped: {
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            email: email.trim(),
            dni: dni.trim(),
          },
          notas: notas.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error guardando cambios");
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Error guardando cambios"));
      setStep("datos");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Editar reserva" onClose={onClose}>
      {step === "datos" ? (
        <form onSubmit={handleNext} className="space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Check-in</div>
              <TextInput
                type="date"
                required
                value={checkinYmd}
                onChange={(e) => setCheckinYmd(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Check-out</div>
              <TextInput
                type="date"
                required
                value={checkoutYmd}
                onChange={(e) => setCheckoutYmd(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">
              Nombre del huésped <span className="text-red-400">*</span>
            </div>
            <TextInput
              type="text"
              required
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={120}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Teléfono</div>
              <TextInput
                type="tel"
                placeholder="+54 9 11..."
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={40}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Email</div>
              <TextInput
                type="email"
                placeholder="huesped@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">DNI / Pasaporte</div>
            <TextInput
              type="text"
              placeholder="12345678"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              maxLength={40}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Notas</div>
            <textarea
              placeholder="Notas internas…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={500}
              className={cx(
                "w-full rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-none",
                "focus:border-[var(--border-primary)]",
              )}
            />
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            <SecondaryButton type="button" onClick={onClose}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit">
              Revisar cambios →
            </PrimaryButton>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          ) : null}

          <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Huésped</span>
              <span className="font-medium text-[var(--text-primary)]">{nombre}</span>
            </div>
            {telefono && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Teléfono</span>
                <span className="text-[var(--text-primary)]">{telefono}</span>
              </div>
            )}
            {email && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Email</span>
                <span className="text-[var(--text-primary)]">{email}</span>
              </div>
            )}
            {dni && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">DNI</span>
                <span className="text-[var(--text-primary)]">{dni}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--border-secondary)] pt-2 mt-2">
              <span className="text-[var(--text-secondary)]">Check-in</span>
              <span className="text-[var(--text-primary)]">
                {checkinDate?.toLocaleDateString("es-AR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Check-out</span>
              <span className="text-[var(--text-primary)]">
                {checkoutDate?.toLocaleDateString("es-AR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Noches</span>
              <span className="text-[var(--text-primary)]">{nights}</span>
            </div>
            {notas && (
              <div className="border-t border-[var(--border-secondary)] pt-2 mt-2">
                <div className="text-[var(--text-secondary)] mb-1">Notas</div>
                <div className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{notas}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <SecondaryButton type="button" onClick={() => setStep("datos")}>
              ← Volver
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? "Guardando..." : "Confirmar cambios"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
