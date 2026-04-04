"use client";

import { useEffect, useMemo, useState } from "react";
import { updateDoc } from "firebase/firestore";
import type { Cama, Espacio, Planta, Reserva, ReservaEstado } from "@/lib/db";
import { reservaRef } from "@/lib/db";
import { useHostelSnapshot } from "@/lib/hostel-snapshot-client";
import {
  NuevaReservaModal,
  type CamaNode as ModalCamaNode,
  type EspacioKey as ModalEspacioKey,
  type ReservaNode as ModalReservaNode,
} from "@/components/NuevaReservaModal";
import { PageSkeleton } from "@/components/PageSkeleton";

type Id = string;
type PlantaNode = { id: Id; data: Planta };
type EspacioNode = { id: Id; data: Espacio };
type CamaNode = { id: Id; data: Cama & { activo?: boolean } };
type ReservaNode = { id: Id; data: Reserva };

type CamaKey = `${Id}/${Id}/${Id}`; // plantaId/espacioId/camaId
type EspacioKey = `${Id}/${Id}`; // plantaId/espacioId

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

const ESTADOS: Array<{ id: ReservaEstado | "todas"; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "en_curso", label: "En curso" },
  { id: "confirmada", label: "Confirmadas" },
  { id: "pendiente", label: "Pendientes" },
  { id: "completada", label: "Completadas" },
  { id: "cancelada", label: "Canceladas" },
];

const ESTADO_LABEL: Record<ReservaEstado, string> = {
  en_curso: "En curso",
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
};

function badgeColors(estado: ReservaEstado): { bg: string; fg: string } {
  // Requisito: fondos oscuros + textos claros por estado
  switch (estado) {
    case "en_curso":
      return { bg: "rgba(30, 58, 138, 0.45)", fg: "rgb(147, 197, 253)" };
    case "confirmada":
      return { bg: "rgba(20, 83, 45, 0.5)", fg: "rgb(134, 239, 172)" };
    case "pendiente":
      return { bg: "rgba(133, 77, 14, 0.55)", fg: "rgb(253, 230, 138)" };
    case "completada":
      return { bg: "rgba(75, 85, 99, 0.55)", fg: "rgb(229, 231, 235)" };
    case "cancelada":
      return { bg: "rgba(127, 29, 29, 0.55)", fg: "rgb(254, 202, 202)" };
  }
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

function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-list)]",
        "disabled:opacity-50",
        props.className,
      )}
      style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
    />
  );
}

export default function ReservasPage() {
  const { hostelId, plantas, espaciosByPlanta, camasByEspacio, reservas, loadError, loading, reload } =
    useHostelSnapshot();

  const [queryText, setQueryText] = useState("");
  const [filterEspacioKey, setFilterEspacioKey] = useState<EspacioKey | "">("");
  const [filterDate, setFilterDate] = useState("");
  const [filterEstado, setFilterEstado] = useState<ReservaEstado | "todas">("todas");

  const [selectedReservaId, setSelectedReservaId] = useState<Id | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    setSelectedReservaId((prev) => (prev && reservas.some((r) => r.id === prev) ? prev : null));
  }, [reservas]);

  const espaciosFlat = useMemo(() => {
    const out: Array<{ key: EspacioKey; plantaId: Id; espacioId: Id; label: string }> = [];
    for (const planta of plantas) {
      const espacios = espaciosByPlanta[planta.id] ?? [];
      for (const espacio of espacios) {
        out.push({
          key: `${planta.id}/${espacio.id}` as EspacioKey,
          plantaId: planta.id,
          espacioId: espacio.id,
          label: `${planta.data.nombre || "Planta"} · ${espacio.data.nombre || "Espacio"}`,
        });
      }
    }
    return out;
  }, [espaciosByPlanta, plantas]);

  const espacioNameByKey = useMemo(() => {
    const map = new Map<EspacioKey, { plantaName: string; espacioName: string }>();
    for (const planta of plantas) {
      const plantaName = planta.data.nombre || planta.id;
      for (const espacio of espaciosByPlanta[planta.id] ?? []) {
        map.set(`${planta.id}/${espacio.id}` as EspacioKey, {
          plantaName,
          espacioName: espacio.data.nombre || espacio.id,
        });
      }
    }
    return map;
  }, [espaciosByPlanta, plantas]);

  const camaNameByKey = useMemo(() => {
    const map = new Map<CamaKey, { camaName: string; camaActivo: boolean }>();
    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<
      [EspacioKey, CamaNode[]]
    >) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      for (const cama of camas) {
        const k = `${plantaId}/${espacioId}/${cama.id}` as CamaKey;
        map.set(k, { camaName: cama.data.nombre || cama.id, camaActivo: cama.data.activo !== false });
      }
    }
    return map;
  }, [camasByEspacio]);

  const filteredReservas = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const date = parseYmd(filterDate);

    return reservas.filter((r) => {
      if (filterEstado !== "todas" && r.data.estado !== filterEstado) return false;

      if (filterEspacioKey) {
        const k = `${r.data.plantaId}/${r.data.espacioId}` as EspacioKey;
        if (k !== filterEspacioKey) return false;
      }

      if (date) {
        const d0 = new Date(date);
        const d1 = new Date(date);
        d0.setHours(0, 0, 0, 0);
        d1.setHours(23, 59, 59, 999);
        const checkin = r.data.checkin.toDate();
        const checkout = r.data.checkout.toDate();
        if (!overlaps(checkin, checkout, d0, d1)) return false;
      }

      if (q) {
        const h = r.data.huesped;
        const space = espacioNameByKey.get(`${r.data.plantaId}/${r.data.espacioId}` as EspacioKey);
        const cama = camaNameByKey.get(
          `${r.data.plantaId}/${r.data.espacioId}/${r.data.camaId}` as CamaKey,
        );
        const haystack = [
          h?.nombre,
          h?.telefono,
          h?.email,
          h?.dni,
          space?.plantaName,
          space?.espacioName,
          cama?.camaName,
          r.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [camaNameByKey, espacioNameByKey, filterDate, filterEspacioKey, filterEstado, queryText, reservas]);

  const selectedReserva = useMemo(() => {
    if (!selectedReservaId) return null;
    return reservas.find((r) => r.id === selectedReservaId) ?? null;
  }, [reservas, selectedReservaId]);

  const activeCount = filteredReservas.length;
  const totalCount = reservas.length;

  function quickActionLabel(estado: ReservaEstado) {
    switch (estado) {
      case "confirmada":
        return "Check-in";
      case "en_curso":
        return "Check-out";
      case "pendiente":
        return "Confirmar";
      default:
        return null;
    }
  }

  async function setEstado(reservaId: Id, next: ReservaEstado) {
    if (!hostelId) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(reservaRef(hostelId, reservaId), { estado: next } satisfies Partial<Reserva>);
      void reload();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error actualizando reserva"));
    } finally {
      setBusy(false);
    }
  }

  async function onQuickAction(r: ReservaNode) {
    const s = r.data.estado;
    if (s === "confirmada") return setEstado(r.id, "en_curso");
    if (s === "en_curso") return setEstado(r.id, "completada");
    if (s === "pendiente") return setEstado(r.id, "confirmada");
  }

  const detail = selectedReserva;
  const detailSpace = detail
    ? espacioNameByKey.get(`${detail.data.plantaId}/${detail.data.espacioId}` as EspacioKey)
    : null;
  const detailCama = detail
    ? camaNameByKey.get(
        `${detail.data.plantaId}/${detail.data.espacioId}/${detail.data.camaId}` as CamaKey,
      )
    : null;

  if (loading || !hostelId) return <PageSkeleton variant="reservas" />;

  return (
    <div className="space-y-5 text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      {/* Topbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Reservas
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {activeCount} resultado{activeCount === 1 ? "" : "s"}
            {queryText || filterEspacioKey || filterDate || filterEstado !== "todas"
              ? ` (de ${totalCount})`
              : ""}
          </p>
        </div>

        <PrimaryButton
          type="button"
          onClick={() => {
            setNewOpen(true);
            setError(null);
          }}
        >
          + Nueva reserva
        </PrimaryButton>
      </div>

      {/* Filtros */}
      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
        "
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_0.9fr_0.9fr]">
          <TextInput
            placeholder="Buscar por huésped, contacto, DNI, habitación, cama…"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />

          <Select
            value={filterEspacioKey}
            onChange={(e) => setFilterEspacioKey(e.target.value as EspacioKey | "")}
          >
            <option value="">Todas las habitaciones</option>
            {espaciosFlat.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </Select>

          <TextInput
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />

          <Select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as ReservaEstado | "todas")}
          >
            {ESTADOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Tabs rápidas */}
        <div className="mt-4 flex flex-wrap gap-2">
          {ESTADOS.map((t) => {
            const active = filterEstado === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterEstado(t.id as ReservaEstado | "todas")}
                className={cx(
                  "rounded-xl border px-3 py-2 text-sm transition",
                  active
                    ? "border-[var(--border-primary)] bg-[var(--bg-list)] text-[var(--text-primary)]"
                    : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {loadError || error ? (
        <div
          className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3 text-sm"
          style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
        >
          {loadError ?? error}
        </div>
      ) : null}

      {/* Lista + detalle */}
      <section
        className="
          grid gap-5 rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
        "
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 420px)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Lista de reservas</div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-secondary)]">
            <div className="divide-y divide-[var(--border-secondary)]">
              {filteredReservas.length === 0 ? (
                <div className="bg-[var(--bg-page)] p-4 text-sm text-[var(--text-tertiary)]">
                  No hay reservas con estos filtros.
                </div>
              ) : (
                filteredReservas.map((r) => {
                  const isSelected = selectedReservaId === r.id;
                  const huesped = r.data.huesped;
                  const contacto = huesped.telefono || huesped.email || "—";
                  const space = espacioNameByKey.get(`${r.data.plantaId}/${r.data.espacioId}` as EspacioKey);
                  const cama = camaNameByKey.get(
                    `${r.data.plantaId}/${r.data.espacioId}/${r.data.camaId}` as CamaKey,
                  );

                  const checkin = r.data.checkin.toDate();
                  const checkout = r.data.checkout.toDate();
                  const noches = nightsBetween(checkin, checkout);

                  const colors = badgeColors(r.data.estado);
                  const qa = quickActionLabel(r.data.estado);

                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelectedReservaId((prev) => (prev === r.id ? null : r.id))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedReservaId((prev) => (prev === r.id ? null : r.id));
                        }
                      }}
                      className={cx(
                        "w-full cursor-pointer bg-[var(--bg-page)] p-4 text-left transition outline-none",
                        isSelected ? "bg-[var(--bg-list)]" : "hover:bg-[var(--bg-list)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {huesped?.nombre || "Huésped"}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                            {contacto}
                            {" · "}
                            {space ? `${space.espacioName}` : r.data.espacioId}
                            {cama ? ` / ${cama.camaName}` : r.data.camaId ? ` / ${r.data.camaId}` : ""}
                          </div>
                          <div className="mt-2 text-xs text-[var(--text-secondary)]">
                            {checkin.toLocaleDateString("es-AR")}
                            {" → "}
                            {checkout.toLocaleDateString("es-AR")}
                            {" · "}
                            {noches} noche{noches === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ backgroundColor: colors.bg, color: colors.fg }}
                          >
                            {ESTADO_LABEL[r.data.estado]}
                          </span>

                          {qa ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void onQuickAction(r);
                              }}
                              className="
                                rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-component)]
                                px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]
                                transition hover:bg-[var(--bg-list)] disabled:opacity-50
                              "
                            >
                              {qa}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <aside className="min-w-0">
          <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Detalle</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Click en una reserva para expandir.
                </div>
              </div>
              {detail ? (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: badgeColors(detail.data.estado).bg,
                    color: badgeColors(detail.data.estado).fg,
                  }}
                >
                  {ESTADO_LABEL[detail.data.estado]}
                </span>
              ) : null}
            </div>

            {!detail ? (
              <div className="mt-4 text-sm text-[var(--text-tertiary)]">
                Seleccioná una reserva de la lista.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Huésped
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)]">Nombre</div>
                      <div className="font-medium">{detail.data.huesped?.nombre || "—"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)]">Teléfono</div>
                        <div className="font-medium">{detail.data.huesped?.telefono || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)]">Email</div>
                        <div className="font-medium">{detail.data.huesped?.email || "—"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)]">DNI</div>
                      <div className="font-medium">{detail.data.huesped?.dni || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Estadia
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-[var(--text-secondary)]">
                      {detailSpace ? `${detailSpace.plantaName} · ${detailSpace.espacioName}` : detail.data.espacioId}
                      {detailCama ? ` / ${detailCama.camaName}` : detail.data.camaId ? ` / ${detail.data.camaId}` : ""}
                    </div>
                    <div className="mt-1 text-[var(--text-secondary)]">
                      {detail.data.checkin.toDate().toLocaleDateString("es-AR")}
                      {" → "}
                      {detail.data.checkout.toDate().toLocaleDateString("es-AR")}
                      {" · "}
                      {nightsBetween(detail.data.checkin.toDate(), detail.data.checkout.toDate())}{" "}
                      noche(s)
                    </div>
                    {detail.data.notas?.trim() ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-page)] p-2 text-xs text-[var(--text-secondary)]">
                        {detail.data.notas}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SecondaryButton type="button" disabled>
                    Editar
                  </SecondaryButton>

                  {detail.data.estado === "confirmada" ? (
                    <PrimaryButton
                      type="button"
                      disabled={busy}
                      onClick={() => void setEstado(detail.id, "en_curso")}
                    >
                      Hacer check-in
                    </PrimaryButton>
                  ) : null}

                  {detail.data.estado === "en_curso" ? (
                    <PrimaryButton
                      type="button"
                      disabled={busy}
                      onClick={() => void setEstado(detail.id, "completada")}
                    >
                      Hacer check-out
                    </PrimaryButton>
                  ) : null}

                  {detail.data.estado === "pendiente" ? (
                    <PrimaryButton
                      type="button"
                      disabled={busy}
                      onClick={() => void setEstado(detail.id, "confirmada")}
                    >
                      Confirmar
                    </PrimaryButton>
                  ) : null}

                  {detail.data.estado !== "cancelada" && detail.data.estado !== "completada" ? (
                    <DangerButton
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const ok = confirm("¿Cancelar esta reserva?");
                        if (!ok) return;
                        void setEstado(detail.id, "cancelada");
                      }}
                    >
                      Cancelar reserva
                    </DangerButton>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      <NuevaReservaModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        camasByEspacio={camasByEspacio as unknown as Record<ModalEspacioKey, ModalCamaNode[]>}
        espacioNameByKey={espacioNameByKey as unknown as Map<ModalEspacioKey, { plantaName: string; espacioName: string }>}
        reservas={reservas as unknown as ModalReservaNode[]}
      />
    </div>
  );
}

