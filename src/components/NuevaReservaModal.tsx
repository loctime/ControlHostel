"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, Timestamp } from "firebase/firestore";
import type { Cama, Reserva, ReservaEstado } from "@/lib/db";
import { reservasCollection } from "@/lib/db";
import { useHostel } from "@/context/HostelContext";

type Id = string;
export type EspacioKey = `${Id}/${Id}`; // plantaId/espacioId
export type CamaKey = `${Id}/${Id}/${Id}`; // plantaId/espacioId/camaId

export type CamaNode = { id: Id; data: Cama & { activo?: boolean } };
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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
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
          relative w-full max-w-2xl rounded-2xl border border-[var(--border-secondary)]
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

export function NuevaReservaModal({
  open,
  onClose,
  camasByEspacio,
  espacioNameByKey,
  reservas,
  defaultCheckin,
  initialBedKey,
  lockBed,
}: {
  open: boolean;
  onClose: () => void;
  camasByEspacio: Record<EspacioKey, CamaNode[]>;
  espacioNameByKey: Map<EspacioKey, { plantaName: string; espacioName: string }>;
  reservas: ReservaNode[];
  defaultCheckin?: Date;
  initialBedKey?: CamaKey;
  lockBed?: boolean;
}) {
  const { hostelId } = useHostel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [checkin, setCheckin] = useState(() => toYmd(defaultCheckin ?? new Date()));
  const [checkout, setCheckout] = useState(() => {
    const d = new Date(defaultCheckin ?? new Date());
    d.setDate(d.getDate() + 1);
    return toYmd(d);
  });
  const [bedKey, setBedKey] = useState<CamaKey | "">("");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [estado, setEstado] = useState<Extract<ReservaEstado, "pendiente" | "confirmada">>(
    "pendiente",
  );
  const [notas, setNotas] = useState("");

  const checkinDate = useMemo(() => parseYmd(checkin), [checkin]);
  const checkoutDate = useMemo(() => parseYmd(checkout), [checkout]);

  const activeStatuses = useMemo(
    () => new Set<ReservaEstado>(["pendiente", "confirmada", "en_curso"]),
    [],
  );

  const availableBeds = useMemo(() => {
    if (!checkinDate || !checkoutDate) return [];
    if (checkoutDate <= checkinDate) return [];

    const out: Array<{
      key: CamaKey;
      label: string;
      plantaId: Id;
      espacioId: Id;
      camaId: Id;
    }> = [];

    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<
      [EspacioKey, CamaNode[]]
    >) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      const space = espacioNameByKey.get(espacioKey);
      const spaceLabel = space
        ? `${space.plantaName} · ${space.espacioName}`
        : `${plantaId}/${espacioId}`;

      for (const cama of camas) {
        const camaId = cama.id;
        const camaActivo = cama.data.activo !== false;
        if (!camaActivo) continue;
        if (cama.data.estado && cama.data.estado !== "libre") continue;

        const hasOverlap = reservas.some((r) => {
          if (!activeStatuses.has(r.data.estado)) return false;
          if (r.data.plantaId !== plantaId) return false;
          if (r.data.espacioId !== espacioId) return false;
          if (r.data.camaId !== camaId) return false;
          return overlaps(
            r.data.checkin.toDate(),
            r.data.checkout.toDate(),
            checkinDate,
            checkoutDate,
          );
        });
        if (hasOverlap) continue;

        out.push({
          key: `${plantaId}/${espacioId}/${camaId}` as CamaKey,
          plantaId,
          espacioId,
          camaId,
          label: `${spaceLabel} · #${cama.data.nombre || camaId}`,
        });
      }
    }

    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [activeStatuses, camasByEspacio, checkinDate, checkoutDate, espacioNameByKey, reservas]);

  useEffect(() => {
    if (!open) return;
    // Al abrir, si viene una cama preseleccionada, setearla.
    if (initialBedKey) {
      setBedKey(initialBedKey);
    }
    // Si nos pasan un defaultCheckin, re-sincronizar fechas al abrir.
    if (defaultCheckin) {
      setCheckin(toYmd(defaultCheckin));
      const d = new Date(defaultCheckin);
      d.setDate(d.getDate() + 1);
      setCheckout(toYmd(d));
    }
    setError(null);
  }, [defaultCheckin, initialBedKey, open]);

  const nights = useMemo(() => {
    if (!checkinDate || !checkoutDate) return 0;
    if (checkoutDate <= checkinDate) return 0;
    return nightsBetween(checkinDate, checkoutDate);
  }, [checkinDate, checkoutDate]);

  function resetAll(nextDefault?: Date) {
    const base = nextDefault ?? defaultCheckin ?? new Date();
    setStep(1);
    setError(null);
    setBusy(false);
    setCheckin(toYmd(base));
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    setCheckout(toYmd(d));
    setBedKey("");
    setNombre("");
    setTelefono("");
    setEmail("");
    setDni("");
    setEstado("pendiente");
    setNotas("");
  }

  async function onCreate() {
    if (!hostelId) {
      setError("No tenés un hostel asignado. Completá el setup inicial.");
      return;
    }
    if (!checkinDate || !checkoutDate) {
      setError("Completá las fechas.");
      return;
    }
    if (checkoutDate <= checkinDate) {
      setError("El checkout debe ser posterior al check-in.");
      return;
    }
    if (!bedKey) {
      setError("Seleccioná una cama disponible.");
      return;
    }
    if (!nombre.trim()) {
      setError("Completá el nombre del huésped.");
      return;
    }

    const [plantaId, espacioId, camaId] = bedKey.split("/") as [Id, Id, Id];

    setBusy(true);
    setError(null);
    try {
      await addDoc(reservasCollection(hostelId), {
        plantaId,
        espacioId,
        camaId,
        checkin: Timestamp.fromDate(checkinDate),
        checkout: Timestamp.fromDate(checkoutDate),
        estado,
        huesped: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          dni: dni.trim(),
        },
        notas: notas.trim(),
      } satisfies Reserva);

      onClose();
      resetAll();
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code) : "";
      if (code.includes("permission-denied")) {
        setError(
          "Permisos insuficientes (Firestore).\n\nVerificá que exista `usuarios/{uid}` con `hostelId` asignado y que tus reglas de Firestore estén publicadas.\nSi acabás de cambiar `firestore.rules`, ejecutá el deploy de reglas.",
        );
      } else {
        setError(errorMessage(e, "Error creando reserva"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Nueva reserva · Paso ${step} de 3`}
      onClose={() => {
        onClose();
        resetAll();
      }}
    >
      {error ? (
        <div
          className="mb-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3 text-sm"
          style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
        >
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Check-in</div>
              <div className="mt-1">
                <TextInput
                  type="date"
                  value={checkin}
                  onChange={(e) => {
                    setCheckin(e.target.value);
                    if (!lockBed) setBedKey("");
                    setError(null);
                  }}
                />
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Check-out</div>
              <div className="mt-1">
                <TextInput
                  type="date"
                  value={checkout}
                  onChange={(e) => {
                    setCheckout(e.target.value);
                    if (!lockBed) setBedKey("");
                    setError(null);
                  }}
                />
              </div>
            </label>
          </div>

          <label className="block">
            <div className="text-xs font-medium text-[var(--text-secondary)]">Cama disponible</div>
            <div className="mt-1">
              <Select
                value={bedKey}
                onChange={(e) => setBedKey(e.target.value as CamaKey)}
                disabled={!!lockBed}
              >
                <option value="">
                  {checkoutDate && checkinDate && checkoutDate > checkinDate
                    ? availableBeds.length === 0
                      ? "Sin camas disponibles"
                      : `Seleccionar (${availableBeds.length} disponibles)`
                    : "Seleccionar (primero elegí fechas válidas)"}
                </option>
                {availableBeds.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.9 }}>
              Se muestran solo camas visibles (<code>activo</code>) sin reservas activas superpuestas.
            </div>
          </label>

          <div className="flex items-center justify-between gap-3">
            <SecondaryButton
              type="button"
              onClick={() => {
                onClose();
                resetAll();
              }}
            >
              Cancelar
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={!bedKey || !checkinDate || !checkoutDate || checkoutDate <= checkinDate}
              onClick={() => setStep(2)}
            >
              Continuar
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Nombre</div>
              <div className="mt-1">
                <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Teléfono</div>
              <div className="mt-1">
                <TextInput value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Email</div>
              <div className="mt-1">
                <TextInput value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">DNI</div>
              <div className="mt-1">
                <TextInput value={dni} onChange={(e) => setDni(e.target.value)} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Estado inicial</div>
              <div className="mt-1">
                <Select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                </Select>
              </div>
            </label>

            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Notas</div>
              <div className="mt-1">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="
                    min-h-[42px] w-full resize-y rounded-xl border border-[var(--border-secondary)]
                    bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                    focus:border-[var(--border-primary)]
                  "
                />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <SecondaryButton type="button" onClick={() => setStep(1)}>
              Volver
            </SecondaryButton>
            <PrimaryButton type="button" disabled={!nombre.trim()} onClick={() => setStep(3)}>
              Continuar
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Resumen</div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--text-secondary)]">
              <div>
                <span className="text-[var(--text-tertiary)]">Huésped: </span>
                <span className="font-medium text-[var(--text-primary)]">{nombre.trim() || "—"}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Contacto: </span>
                {telefono.trim() || email.trim() || "—"}
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Fechas: </span>
                {checkinDate?.toLocaleDateString("es-AR") ?? "—"}
                {" → "}
                {checkoutDate?.toLocaleDateString("es-AR") ?? "—"}
                {" · "}
                {nights} noche(s)
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Cama: </span>
                {bedKey
                  ? availableBeds.find((b) => b.key === bedKey)?.label || bedKey
                  : "—"}
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Estado inicial: </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {estado === "confirmada" ? "Confirmada" : "Pendiente"}
                </span>
              </div>
              {notas.trim() ? (
                <div className="pt-2">
                  <div className="text-[var(--text-tertiary)]">Notas</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-2 text-xs">
                    {notas.trim()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <SecondaryButton type="button" onClick={() => setStep(2)}>
              Volver
            </SecondaryButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void onCreate()}>
              {busy ? "Creando..." : "Confirmar reserva"}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

