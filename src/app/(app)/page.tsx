"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import type { Cama, Espacio, Planta, Reserva, ReservaEstado } from "@/lib/db";
import {
  camasCollection,
  espaciosCollection,
  plantasCollection,
  reservaRef,
  reservasCollection,
} from "@/lib/db";
import {
  NuevaReservaModal,
  type CamaNode as ModalCamaNode,
  type EspacioKey as ModalEspacioKey,
  type ReservaNode as ModalReservaNode,
} from "@/components/NuevaReservaModal";

type Id = string;
type PlantaNode = { id: Id; data: Planta };
type EspacioNode = { id: Id; data: Espacio };
type CamaNode = { id: Id; data: Cama & { activo?: boolean } };
type ReservaNode = { id: Id; data: Reserva };

type EspacioKey = `${Id}/${Id}`; // plantaId/espacioId
type CamaKey = `${Id}/${Id}/${Id}`; // plantaId/espacioId/camaId

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

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sameYmd(a: Date, b: Date) {
  return toYmd(a) === toYmd(b);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

function reservaBadge(text: string, variant: "ok" | "warn" | "info" | "muted") {
  const styles: Record<typeof variant, { bg: string; fg: string }> = {
    ok: { bg: "rgba(20, 83, 45, 0.5)", fg: "rgb(134, 239, 172)" },
    warn: { bg: "rgba(133, 77, 14, 0.55)", fg: "rgb(253, 230, 138)" },
    info: { bg: "rgba(30, 58, 138, 0.45)", fg: "rgb(147, 197, 253)" },
    muted: { bg: "rgba(75, 85, 99, 0.55)", fg: "rgb(229, 231, 235)" },
  };
  const c = styles[variant];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {text}
    </span>
  );
}

const RESERVA_ACTIVA: ReadonlySet<ReservaEstado> = new Set([
  "pendiente",
  "confirmada",
  "en_curso",
]);

export default function PanelPage() {
  const hostelId = "demo";
  const today = useMemo(() => startOfDay(new Date()), []);
  const fecha = useMemo(() => {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }, []);

  const [plantas, setPlantas] = useState<PlantaNode[]>([]);
  const [espaciosByPlanta, setEspaciosByPlanta] = useState<Record<Id, EspacioNode[]>>({});
  const [camasByEspacio, setCamasByEspacio] = useState<Record<EspacioKey, CamaNode[]>>({});
  const [reservas, setReservas] = useState<ReservaNode[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const map = new Map<CamaKey, string>();
    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<
      [EspacioKey, CamaNode[]]
    >) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      for (const cama of camas) {
        map.set(
          `${plantaId}/${espacioId}/${cama.id}` as CamaKey,
          cama.data.nombre || cama.id,
        );
      }
    }
    return map;
  }, [camasByEspacio]);

  const camasActivas = useMemo(() => {
    const out: Array<{ key: CamaKey; plantaId: Id; espacioId: Id; camaId: Id }> = [];
    for (const [espacioKey, camas] of Object.entries(camasByEspacio) as Array<[EspacioKey, CamaNode[]]>) {
      const [plantaId, espacioId] = espacioKey.split("/") as [Id, Id];
      for (const cama of camas) {
        if (cama.data.activo === false) continue;
        out.push({
          key: `${plantaId}/${espacioId}/${cama.id}` as CamaKey,
          plantaId,
          espacioId,
          camaId: cama.id,
        });
      }
    }
    return out;
  }, [camasByEspacio]);

  const metrics = useMemo(() => {
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const reservasQueCubrenHoyActivas = reservas.filter((r) => {
      if (!RESERVA_ACTIVA.has(r.data.estado)) return false;
      return overlaps(r.data.checkin.toDate(), r.data.checkout.toDate(), dayStart, dayEnd);
    });

    const ocupadasEnCurso = new Set<string>();
    for (const r of reservas) {
      if (r.data.estado !== "en_curso") continue;
      if (!overlaps(r.data.checkin.toDate(), r.data.checkout.toDate(), dayStart, dayEnd)) continue;
      ocupadasEnCurso.add(`${r.data.plantaId}/${r.data.espacioId}/${r.data.camaId}`);
    }

    const ocupacionTotal = camasActivas.length;
    const ocupacionHoy = ocupadasEnCurso.size;
    const ocupacionPct = ocupacionTotal === 0 ? 0 : Math.round((ocupacionHoy / ocupacionTotal) * 100);

    const llegadas = reservas.filter((r) => {
      const isCheckinHoy = sameYmd(r.data.checkin.toDate(), today);
      return isCheckinHoy && (r.data.estado === "confirmada" || r.data.estado === "en_curso");
    });
    const llegadasPendientes = reservas.filter((r) => {
      const isCheckinHoy = sameYmd(r.data.checkin.toDate(), today);
      return isCheckinHoy && r.data.estado === "pendiente";
    });

    const salidas = reservas.filter((r) => {
      const isCheckoutHoy = sameYmd(r.data.checkout.toDate(), today);
      return isCheckoutHoy && (r.data.estado === "en_curso" || r.data.estado === "completada");
    });

    const ocupadasCualquierActiva = new Set<string>();
    for (const r of reservasQueCubrenHoyActivas) {
      ocupadasCualquierActiva.add(`${r.data.plantaId}/${r.data.espacioId}/${r.data.camaId}`);
    }
    const disponibles = Math.max(0, ocupacionTotal - ocupadasCualquierActiva.size);

    return [
      {
        label: "Ocupación hoy",
        value: `${ocupacionPct}%`,
        hint: `${ocupacionHoy} de ${ocupacionTotal} camas (en curso)`,
      },
      {
        label: "Llegadas hoy",
        value: String(llegadas.length),
        hint: `${llegadasPendientes.length} pendiente(s)`,
      },
      {
        label: "Salidas hoy",
        value: String(salidas.length),
        hint: "Check-outs",
      },
      {
        label: "Disponibles",
        value: String(disponibles),
        hint: "Camas activas sin reserva activa hoy",
      },
    ] as const;
  }, [camasActivas.length, reservas, today]);

  const movimientosHoy = useMemo(() => {
    const list = reservas.filter((r) => {
      const ci = r.data.checkin.toDate();
      const co = r.data.checkout.toDate();
      return sameYmd(ci, today) || sameYmd(co, today);
    });
    list.sort((a, b) => a.data.checkin.toMillis() - b.data.checkin.toMillis());
    return list;
  }, [reservas, today]);

  async function setEstado(reservaId: Id, next: ReservaEstado) {
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
    <div className="space-y-6 text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Panel</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{fecha}</p>
        </div>

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="
            inline-flex items-center justify-center rounded-xl bg-[var(--bg-accent)] px-4 py-2.5
            text-sm font-medium text-[var(--text-button)] shadow-sm transition hover:opacity-90
          "
        >
          + Nueva reserva
        </button>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3 text-sm"
          style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
        >
          {error}
        </div>
      ) : null}

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
          backdrop-blur
        "
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="
                rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-5
                text-[var(--text-primary)]
                shadow-sm
              "
            >
              <div className="text-xs font-medium text-[var(--text-secondary)]">{m.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{m.value}</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.85 }}>
                {m.hint}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
          backdrop-blur
        "
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Movimientos de hoy</h2>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)]">
          {movimientosHoy.length === 0 ? (
            <div className="p-4 text-sm text-[var(--text-tertiary)]">Sin movimientos para hoy</div>
          ) : (
            <div className="divide-y divide-[var(--border-secondary)]">
              {movimientosHoy.map((r) => {
                const huesped = r.data.huesped;
                const key = `${r.data.plantaId}/${r.data.espacioId}` as EspacioKey;
                const space = espacioNameByKey.get(key);
                const camaLabel =
                  camaNameByKey.get(
                    `${r.data.plantaId}/${r.data.espacioId}/${r.data.camaId}` as CamaKey,
                  ) ?? r.data.camaId;
                const isCI = sameYmd(r.data.checkin.toDate(), today);
                const isCO = sameYmd(r.data.checkout.toDate(), today);

                const badge =
                  isCI ? reservaBadge("Llegada", "info")
                  : isCO ? reservaBadge("Salida", "muted")
                  : r.data.estado === "confirmada" ? reservaBadge("Confirmada", "ok")
                  : r.data.estado === "pendiente" ? reservaBadge("Pendiente", "warn")
                  : reservaBadge("Reserva", "muted");

                const quick =
                  r.data.estado === "confirmada"
                    ? { label: "Check-in", next: "en_curso" as const }
                    : r.data.estado === "en_curso"
                      ? { label: "Check-out", next: "completada" as const }
                      : null;

                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex h-9 w-9 items-center justify-center rounded-xl
                          border border-[var(--border-secondary)] bg-[var(--bg-component)]
                          text-xs font-semibold text-[var(--text-primary)]
                        "
                      >
                        {initials(huesped?.nombre || "")}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {huesped?.nombre || "Huésped"}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                          {space ? `${space.espacioName}` : r.data.espacioId}
                          {" / "}
                          {camaLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {badge}
                      {quick ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void setEstado(r.id, quick.next)}
                          className={cx(
                            "rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-component)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-list)] disabled:opacity-50",
                          )}
                        >
                          {quick.label}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <NuevaReservaModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        hostelId={hostelId}
        camasByEspacio={camasByEspacio as unknown as Record<ModalEspacioKey, ModalCamaNode[]>}
        espacioNameByKey={espacioNameByKey as unknown as Map<ModalEspacioKey, { plantaName: string; espacioName: string }>}
        reservas={reservas as unknown as ModalReservaNode[]}
        defaultCheckin={today}
      />
    </div>
  );
}

