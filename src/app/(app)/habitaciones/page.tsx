"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import type { Cama, CamaEstado, Espacio, Planta, Reserva, ReservaEstado } from "@/lib/db";
import {
  camaRef,
  camasCollection,
  espaciosCollection,
  plantasCollection,
  reservaRef,
  reservasCollection,
} from "@/lib/db";
import { useHostel } from "@/context/HostelContext";
import {
  NuevaReservaModal,
  type CamaKey,
  type EspacioKey,
  type CamaNode as ModalCamaNode,
  type ReservaNode as ModalReservaNode,
} from "@/components/NuevaReservaModal";

type Id = string;
type PlantaNode = { id: Id; data: Planta };
type EspacioNode = { id: Id; data: Espacio };
type CamaNode = { id: Id; data: Cama & { activo?: boolean } };
type ReservaNode = { id: Id; data: Reserva };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  return fallback;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

type CamaStatus = "libre" | "ocupada" | "bloqueada" | "fuera_de_servicio";

function statusColor(s: CamaStatus) {
  switch (s) {
    case "libre":
      return "rgb(34, 197, 94)";
    case "ocupada":
      return "rgb(59, 130, 246)";
    case "bloqueada":
      return "rgb(234, 179, 8)";
    case "fuera_de_servicio":
      return "rgb(239, 68, 68)";
  }
}

function statusLabel(s: CamaStatus) {
  switch (s) {
    case "libre":
      return "Libre";
    case "ocupada":
      return "Ocupada";
    case "bloqueada":
      return "Bloqueada";
    case "fuera_de_servicio":
      return "Fuera de servicio";
  }
}

const RESERVA_ACTIVA: ReadonlySet<ReservaEstado> = new Set([
  "pendiente",
  "confirmada",
  "en_curso",
]);

type BedFilter = "todas" | "ocupadas" | "libres" | "bloqueadas";
type PanelTab = "estado" | "reservas";

function Badge({ text }: { text: string }) {
  return (
    <span
      className="
        inline-flex items-center rounded-full border border-[var(--border-secondary)]
        bg-[var(--bg-component)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]
      "
    >
      {text}
    </span>
  );
}

export default function HabitacionesPage() {
  const { hostelId } = useHostel();
  if (!hostelId) return null;

  const [plantas, setPlantas] = useState<PlantaNode[]>([]);
  const [espaciosByPlanta, setEspaciosByPlanta] = useState<Record<Id, EspacioNode[]>>({});
  const [camasByEspacio, setCamasByEspacio] = useState<Record<EspacioKey, CamaNode[]>>({});
  const [reservas, setReservas] = useState<ReservaNode[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const dayStart = useMemo(() => startOfDay(today), [today]);
  const dayEnd = useMemo(() => endOfDay(today), [today]);

  const [filter, setFilter] = useState<BedFilter>("todas");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("estado");
  const [selected, setSelected] = useState<{ plantaId: Id; espacioId: Id; camaId: Id } | null>(
    null,
  );

  const [newOpen, setNewOpen] = useState(false);

  const unsubEspaciosByPlanta = useRef(new Map<Id, () => void>());
  const unsubCamasByEspacio = useRef(new Map<EspacioKey, () => void>());

  useEffect(() => {
    const espaciosMap = unsubEspaciosByPlanta.current;
    const camasMap = unsubCamasByEspacio.current;

    const qPlantas = query(plantasCollection(hostelId), orderBy("orden", "asc"));
    const unsubPlantas = onSnapshot(
      qPlantas,
      (snap) => {
        setError(null);
        const next = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        setPlantas(next);

        const plantaIds = new Set(next.map((p) => p.id));
        for (const [plantaId, unsub] of espaciosMap.entries()) {
          if (!plantaIds.has(plantaId)) {
            unsub();
            espaciosMap.delete(plantaId);
            setEspaciosByPlanta((prev) => {
              const copy = { ...prev };
              delete copy[plantaId];
              return copy;
            });
          }
        }

        for (const plantaId of plantaIds) {
          if (espaciosMap.has(plantaId)) continue;

          const qEspacios = query(
            espaciosCollection(hostelId, plantaId),
            orderBy("nombre", "asc"),
          );
          const unsubEspacios = onSnapshot(
            qEspacios,
            (snapEspacios) => {
              setError(null);
              const nextEspacios = snapEspacios.docs.map((d) => ({ id: d.id, data: d.data() }));
              setEspaciosByPlanta((prev) => ({ ...prev, [plantaId]: nextEspacios }));

              const nextKeys = new Set(
                nextEspacios.map((e) => `${plantaId}/${e.id}` as EspacioKey),
              );
              for (const [key, unsubCamas] of camasMap.entries()) {
                if (!key.startsWith(`${plantaId}/`)) continue;
                if (!nextKeys.has(key)) {
                  unsubCamas();
                  camasMap.delete(key);
                  setCamasByEspacio((prev) => {
                    const copy = { ...prev };
                    delete copy[key];
                    return copy;
                  });
                }
              }

              for (const espacio of nextEspacios) {
                const key = `${plantaId}/${espacio.id}` as EspacioKey;
                if (camasMap.has(key)) continue;

                const qCamas = query(
                  camasCollection(hostelId, plantaId, espacio.id),
                  orderBy("nombre", "asc"),
                );
                const unsubCamas = onSnapshot(
                  qCamas,
                  (snapCamas) => {
                    setError(null);
                    const nextCamas = snapCamas.docs.map((d) => {
                      const raw = d.data() as Cama & { activo?: boolean };
                      return { id: d.id, data: raw };
                    });
                    setCamasByEspacio((prev) => ({ ...prev, [key]: nextCamas }));
                  },
                  (e) => setError(errorMessage(e, "Error leyendo camas")),
                );
                camasMap.set(key, unsubCamas);
              }
            },
            (e) => setError(errorMessage(e, "Error leyendo espacios")),
          );
          espaciosMap.set(plantaId, unsubEspacios);
        }
      },
      (e) => setError(errorMessage(e, "Error leyendo plantas")),
    );

    const qReservas = query(reservasCollection(hostelId), orderBy("checkin", "desc"));
    const unsubReservas = onSnapshot(
      qReservas,
      (snap) => {
        setError(null);
        setReservas(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
      },
      (e) => setError(errorMessage(e, "Error leyendo reservas")),
    );

    return () => {
      unsubPlantas();
      unsubReservas();
      for (const u of espaciosMap.values()) u();
      for (const u of camasMap.values()) u();
      espaciosMap.clear();
      camasMap.clear();
    };
  }, [hostelId]);

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
    const map = new Map<CamaKey, { camaName: string; camaActivo: boolean; estado: CamaEstado }>();
    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<
      [EspacioKey, CamaNode[]]
    >) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      for (const cama of camas) {
        map.set(`${plantaId}/${espacioId}/${cama.id}` as CamaKey, {
          camaName: cama.data.nombre || cama.id,
          camaActivo: cama.data.activo !== false,
          estado: cama.data.estado ?? "libre",
        });
      }
    }
    return map;
  }, [camasByEspacio]);

  const statusByCamaKey = useMemo(() => {
    const map = new Map<CamaKey, CamaStatus>();
    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<
      [EspacioKey, CamaNode[]]
    >) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      for (const cama of camas) {
        const key = `${plantaId}/${espacioId}/${cama.id}` as CamaKey;

        const activo = cama.data.activo !== false;
        if (!activo || cama.data.estado === "fuera_de_servicio") {
          map.set(key, "fuera_de_servicio");
          continue;
        }
        if (cama.data.estado === "bloqueada") {
          map.set(key, "bloqueada");
          continue;
        }

        const hasActiveReservaToday = reservas.some((r) => {
          if (!RESERVA_ACTIVA.has(r.data.estado)) return false;
          if (r.data.plantaId !== plantaId) return false;
          if (r.data.espacioId !== espacioId) return false;
          if (r.data.camaId !== cama.id) return false;
          return overlaps(r.data.checkin.toDate(), r.data.checkout.toDate(), dayStart, dayEnd);
        });
        map.set(key, hasActiveReservaToday ? "ocupada" : "libre");
      }
    }
    return map;
  }, [camasByEspacio, dayEnd, dayStart, reservas]);

  const counters = useMemo(() => {
    let total = 0;
    let libres = 0;
    for (const key of statusByCamaKey.keys()) {
      const info = camaNameByKey.get(key);
      if (!info?.camaActivo) continue;
      total += 1;
      const st = statusByCamaKey.get(key);
      if (st === "libre") libres += 1;
    }
    return { total, libres };
  }, [camaNameByKey, statusByCamaKey]);

  const selectedInfo = useMemo(() => {
    if (!selected) return null;
    const key = `${selected.plantaId}/${selected.espacioId}` as EspacioKey;
    const camaKey = `${selected.plantaId}/${selected.espacioId}/${selected.camaId}` as CamaKey;
    const space = espacioNameByKey.get(key);
    const cama = camaNameByKey.get(camaKey);
    const status = statusByCamaKey.get(camaKey) ?? "libre";

    const reservaActiva = reservas.find((r) => {
      if (!RESERVA_ACTIVA.has(r.data.estado)) return false;
      if (r.data.plantaId !== selected.plantaId) return false;
      if (r.data.espacioId !== selected.espacioId) return false;
      if (r.data.camaId !== selected.camaId) return false;
      return overlaps(r.data.checkin.toDate(), r.data.checkout.toDate(), dayStart, dayEnd);
    }) ?? null;

    const futuras = reservas
      .filter((r) => {
        if (r.data.plantaId !== selected.plantaId) return false;
        if (r.data.espacioId !== selected.espacioId) return false;
        if (r.data.camaId !== selected.camaId) return false;
        return r.data.checkin.toDate() > dayEnd;
      })
      .sort((a, b) => a.data.checkin.toMillis() - b.data.checkin.toMillis());

    return { key, camaKey, space, cama, status, reservaActiva, futuras };
  }, [camaNameByKey, dayEnd, dayStart, espacioNameByKey, reservas, selected, statusByCamaKey]);

  function camaVisibleByFilter(status: CamaStatus) {
    if (filter === "todas") return true;
    if (filter === "ocupadas") return status === "ocupada";
    if (filter === "libres") return status === "libre";
    if (filter === "bloqueadas") return status === "bloqueada" || status === "fuera_de_servicio";
    return true;
  }

  async function onChangeCamaEstado(next: CamaEstado) {
    if (!hostelId || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(
        camaRef(hostelId, selected.plantaId, selected.espacioId, selected.camaId),
        { estado: next } as Partial<Cama>,
      );
    } catch (e: unknown) {
      setError(errorMessage(e, "Error actualizando cama"));
    } finally {
      setBusy(false);
    }
  }

  async function setReservaEstado(reservaId: Id, next: ReservaEstado) {
    if (!hostelId) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(reservaRef(hostelId, reservaId), { estado: next } satisfies Partial<Reserva>);
    } catch (e: unknown) {
      setError(errorMessage(e, "Error actualizando reserva"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      {/* Topbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Habitaciones
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {counters.total} camas totales · {counters.libres} disponibles hoy
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "todas", label: "Todas" },
              { id: "ocupadas", label: "Solo ocupadas" },
              { id: "libres", label: "Solo libres" },
              { id: "bloqueadas", label: "Solo bloqueadas" },
            ] as const
          ).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setFilter(b.id)}
              className={cx(
                "rounded-xl border px-3 py-2 text-sm transition",
                filter === b.id
                  ? "border-[var(--border-primary)] bg-[var(--bg-list)] text-[var(--text-primary)]"
                  : "border-[var(--border-secondary)] bg-[var(--bg-component)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3 text-sm"
          style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
        >
          {error}
        </div>
      ) : null}

      {/* Mapa */}
      <section className="space-y-4">
        {plantas.map((planta) => {
          const espacios = espaciosByPlanta[planta.id] ?? [];
          return (
            <div
              key={planta.id}
              className="
                rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
              "
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">
                    {planta.data.nombre || "Planta"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {espacios.length} espacio(s)
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {espacios.map((espacio) => {
                  const espacioKey = `${planta.id}/${espacio.id}` as EspacioKey;
                  const camas = camasByEspacio[espacioKey] ?? [];
                  const hasCamas = espacio.data.tipo !== "comun";
                  return (
                    <div
                      key={espacio.id}
                      className="
                        rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4
                      "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {espacio.data.nombre || "Espacio"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {espacio.data.tipo}
                          </div>
                        </div>
                        <Badge text={`${camas.filter((c) => c.data.activo !== false).length} camas`} />
                      </div>

                      {hasCamas ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {camas.length === 0 ? (
                            <div className="text-sm text-[var(--text-tertiary)]">Sin camas.</div>
                          ) : (
                            camas.map((c) => {
                              const camaKey = `${planta.id}/${espacio.id}/${c.id}` as CamaKey;
                              const st = statusByCamaKey.get(camaKey) ?? "libre";
                              if (!camaVisibleByFilter(st)) return null;
                              const title = `${c.data.nombre || c.id} · ${statusLabel(st)}`;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  title={title}
                                  onClick={() => {
                                    setSelected({ plantaId: planta.id, espacioId: espacio.id, camaId: c.id });
                                    setPanelOpen(true);
                                    setPanelTab("estado");
                                  }}
                                  className="
                                    h-8 w-8 rounded-xl border border-black/10 transition
                                    hover:opacity-90
                                  "
                                  style={{ backgroundColor: statusColor(st) }}
                                  aria-label={title}
                                />
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-[var(--text-tertiary)]">
                          Espacio común (sin camas)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Panel lateral */}
      {panelOpen && selectedInfo ? (
        <div
          className="
            fixed right-0 top-0 z-40 h-screen w-[300px]
            border-l border-[var(--border-secondary)] bg-[var(--bg-component)] shadow-xl
          "
        >
          <div className="flex items-start justify-between border-b border-[var(--border-secondary)] px-4 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {selectedInfo.cama?.camaName || "Cama"}
              </div>
              <div className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                {selectedInfo.space
                  ? `${selectedInfo.space.plantaName} · ${selectedInfo.space.espacioName}`
                  : selectedInfo.key}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-list)]"
            >
              × Cerrar
            </button>
          </div>

          <div className="px-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "estado", label: "Estado" },
                  { id: "reservas", label: "Reservas próximas" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPanelTab(t.id)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    panelTab === t.id
                      ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                      : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100%-126px)] overflow-auto px-4 pb-4 pt-4">
            {panelTab === "estado" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Estado hoy
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: statusColor(selectedInfo.status) }}
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {statusLabel(selectedInfo.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Reserva activa
                  </div>
                  {selectedInfo.reservaActiva ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {selectedInfo.reservaActiva.data.huesped?.nombre || "Huésped"}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {selectedInfo.reservaActiva.data.checkin.toDate().toLocaleDateString("es-AR")}
                        {" → "}
                        {selectedInfo.reservaActiva.data.checkout.toDate().toLocaleDateString("es-AR")}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedInfo.reservaActiva.data.estado === "confirmada" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void setReservaEstado(selectedInfo.reservaActiva!.id, "en_curso")}
                            className="
                              rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-component)]
                              px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition
                              hover:bg-[var(--bg-list)] disabled:opacity-50
                            "
                          >
                            Check-in
                          </button>
                        ) : null}
                        {selectedInfo.reservaActiva.data.estado === "en_curso" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void setReservaEstado(selectedInfo.reservaActiva!.id, "completada")}
                            className="
                              rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-component)]
                              px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition
                              hover:bg-[var(--bg-list)] disabled:opacity-50
                            "
                          >
                            Check-out
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-[var(--text-tertiary)]">Sin reserva activa hoy.</div>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Cambiar estado (cama)
                  </div>
                  <div className="mt-3">
                    <select
                      value={selectedInfo.cama?.estado ?? "libre"}
                      onChange={(e) => void onChangeCamaEstado(e.target.value as CamaEstado)}
                      disabled={busy}
                      className="
                        w-full rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)]
                        px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                        focus:border-[var(--border-primary)] disabled:opacity-50
                      "
                    >
                      <option value="libre">Libre</option>
                      <option value="ocupada">Ocupada</option>
                      <option value="bloqueada">Bloqueada</option>
                      <option value="fuera_de_servicio">Fuera de servicio</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOpen(true)}
                    className="
                      inline-flex items-center justify-center rounded-xl bg-[var(--bg-accent)] px-4 py-2.5
                      text-sm font-medium text-[var(--text-button)] shadow-sm transition hover:opacity-90
                    "
                  >
                    + Reservar esta cama
                  </button>
                </div>
              </div>
            ) : null}

            {panelTab === "reservas" ? (
              <div className="space-y-2">
                {selectedInfo.futuras.length === 0 ? (
                  <div className="text-sm text-[var(--text-tertiary)]">No hay reservas próximas.</div>
                ) : (
                  selectedInfo.futuras.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3"
                    >
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {r.data.huesped?.nombre || "Huésped"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {r.data.checkin.toDate().toLocaleDateString("es-AR")}
                        {" → "}
                        {r.data.checkout.toDate().toLocaleDateString("es-AR")}
                      </div>
                      <div className="mt-2 text-xs text-[var(--text-secondary)]">{r.data.estado}</div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <NuevaReservaModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        camasByEspacio={camasByEspacio as unknown as Record<EspacioKey, ModalCamaNode[]>}
        espacioNameByKey={espacioNameByKey as unknown as Map<EspacioKey, { plantaName: string; espacioName: string }>}
        reservas={reservas as unknown as ModalReservaNode[]}
        defaultCheckin={today}
        initialBedKey={selectedInfo?.camaKey}
        lockBed
      />
    </div>
  );
}

