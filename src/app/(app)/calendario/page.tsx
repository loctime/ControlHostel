  "use client";

  import { useMemo, useState } from "react";
  import { addDoc, Timestamp, updateDoc } from "firebase/firestore";
  import type {
    Bloqueo,
    Cama,
    Espacio,
    Planta,
    Reserva,
    ReservaEstado,
  } from "@/lib/db";
  import { bloqueosCollection, reservaRef } from "@/lib/db";
  import { useHostelSnapshot } from "@/lib/hostel-snapshot-client";
  import { PageSkeleton } from "@/components/PageSkeleton";
  import {
    NuevaReservaModal,
    type CamaKey,
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

  function parseYmd(value: string): Date | null {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    // intervalos [start, end) para reservas/bloqueos (checkout/hasta excluyente)
    return aStart < bEnd && aEnd > bStart;
  }

  function coversDate(start: Date, end: Date, day: Date) {
    const d0 = startOfDay(day);
    const d1 = endOfDay(day);
    return overlaps(start, end, d0, d1);
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

  const RESERVA_ACTIVA: ReadonlySet<ReservaEstado> = new Set([
    "pendiente",
    "confirmada",
    "en_curso",
  ]);

  type ViewMode = "mes" | "semana";
  type MovTab = "hoy" | "todas" | "bloqueadas";
  type SpaceTab = "estado" | "reservas" | "pendientes";

  type CamaStatus = "ocupada" | "libre" | "bloqueada" | "fuera_de_servicio";

  function camaStatusColor(status: CamaStatus) {
    switch (status) {
      case "ocupada":
        return "rgb(59, 130, 246)"; // azul
      case "libre":
        return "rgb(34, 197, 94)"; // verde
      case "bloqueada":
        return "rgb(234, 179, 8)"; // amarillo
      case "fuera_de_servicio":
        return "rgb(239, 68, 68)"; // rojo
    }
  }

  function reservaEstadoLabel(s: ReservaEstado) {
    switch (s) {
      case "en_curso":
        return "En curso";
      case "confirmada":
        return "Confirmada";
      case "pendiente":
        return "Pendiente";
      case "completada":
        return "Completada";
      case "cancelada":
        return "Cancelada";
    }
  }

  function reservaBadgeColors(estado: ReservaEstado): { bg: string; fg: string } {
    // mismo esquema que Reservas
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

  export default function CalendarioPage() {
    const {
      hostelId,
      plantas,
      espaciosByPlanta,
      camasByEspacio,
      reservas,
      bloqueos,
      loadError,
      loading,
      reload,
    } = useHostelSnapshot();

    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const today = useMemo(() => startOfDay(new Date()), []);
    const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
    const [cursorMonth, setCursorMonth] = useState<Date>(() => {
      const d = new Date();
      d.setDate(1);
      return startOfDay(d);
    });
    const [viewMode, setViewMode] = useState<ViewMode>("mes");

    const [movTab, setMovTab] = useState<MovTab>("hoy");

    const [spacePanelOpen, setSpacePanelOpen] = useState(false);
    const [spacePanelTab, setSpacePanelTab] = useState<SpaceTab>("estado");
    const [selectedSpace, setSelectedSpace] = useState<{ plantaId: Id; espacioId: Id } | null>(
      null,
    );

    const [newReservaOpen, setNewReservaOpen] = useState(false);
    const [newReservaInitialBedKey, setNewReservaInitialBedKey] = useState<CamaKey | undefined>(
      undefined,
    );
    const [newReservaInitialEspacioKey, setNewReservaInitialEspacioKey] = useState<
      EspacioKey | undefined
    >(undefined);

    const [deletingBloqueoId, setDeletingBloqueoId] = useState<string | null>(null);

    async function eliminarBloqueo(bloqueoId: string) {
      if (deletingBloqueoId) return;
      setDeletingBloqueoId(bloqueoId);
      setError(null);
      try {
        const res = await fetch("/api/hostels/bloqueos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ bloqueoId }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Error eliminando bloqueo");
        }
        void reload();
      } catch (e) {
        setError(errorMessage(e, "Error eliminando bloqueo"));
      } finally {
        setDeletingBloqueoId(null);
      }
    }

    // Modal bloquear fechas
    const [blockOpen, setBlockOpen] = useState(false);
    const [blockDesde, setBlockDesde] = useState(() => toYmd(new Date()));
    const [blockHasta, setBlockHasta] = useState(() => toYmd(addDays(new Date(), 1)));
    const [blockMotivo, setBlockMotivo] = useState("");

    const espacioNameByKey = useMemo(() => {
      const map = new Map<EspacioKey, { plantaName: string; espacioName: string; plantaId: Id; espacioId: Id }>();
      for (const planta of plantas) {
        const plantaName = planta.data.nombre || planta.id;
        for (const espacio of espaciosByPlanta[planta.id] ?? []) {
          map.set(`${planta.id}/${espacio.id}` as EspacioKey, {
            plantaName,
            espacioName: espacio.data.nombre || espacio.id,
            plantaId: planta.id,
            espacioId: espacio.id,
          });
        }
      }
      return map;
    }, [espaciosByPlanta, plantas]);

    const camaNameById = useMemo(() => {
      const map = new Map<string, string>();
      for (const camas of Object.values(camasByEspacio)) {
        for (const cama of camas) {
          map.set(cama.id, cama.data.nombre || cama.id);
        }
      }
      return map;
    }, [camasByEspacio]);

    function getCamaStatus(args: {
      plantaId: Id;
      espacioId: Id;
      cama: CamaNode;
      date: Date;
    }): CamaStatus {
      const { plantaId, espacioId, cama, date } = args;

      // respetar campo activo (si está en false lo tratamos como fuera de servicio para el mapa)
      const activo = cama.data.activo !== false;
      if (!activo) return "fuera_de_servicio";

      if (cama.data.estado === "fuera_de_servicio") return "fuera_de_servicio";

      const camaId = cama.id;

      const hasReserva = reservas.some((r) => {
        if (!RESERVA_ACTIVA.has(r.data.estado)) return false;
        if (r.data.plantaId !== plantaId) return false;
        if (r.data.espacioId !== espacioId) return false;
        if (r.data.camaId !== camaId) return false;
        return coversDate(r.data.checkin.toDate(), r.data.checkout.toDate(), date);
      });
      if (hasReserva) return "ocupada";

      const hasBloqueo = bloqueos.some((b) => {
        if (b.data.plantaId && b.data.plantaId !== plantaId) return false;
        if (b.data.espacioId !== espacioId) return false;
        if (b.data.camaId !== camaId) return false;
        return coversDate(b.data.desde.toDate(), b.data.hasta.toDate(), date);
      });
      if (hasBloqueo) return "bloqueada";

      if (cama.data.estado === "bloqueada") return "bloqueada";
      if (cama.data.estado === "ocupada") return "ocupada";

      return "libre";
    }

    const activityByYmd = useMemo(() => {
      const map = new Map<string, { reservas: number; bloqueos: number }>();

      function bump(ymd: string, key: "reservas" | "bloqueos") {
        const prev = map.get(ymd) ?? { reservas: 0, bloqueos: 0 };
        map.set(ymd, { ...prev, [key]: prev[key] + 1 });
      }

      const monthStart = startOfDay(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1));
      const monthEnd = startOfDay(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 1));
      // margen para grilla (hasta 6 semanas)
      const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7)); // lunes
      const gridEnd = addDays(gridStart, 42);

      for (const r of reservas) {
        if (!RESERVA_ACTIVA.has(r.data.estado) && r.data.estado !== "completada") {
          // aún así queremos punto por actividad general (incluye canceladas?) -> tomamos todas reservas
        }
        const a = r.data.checkin.toDate();
        const b = r.data.checkout.toDate();
        // iterar días del rango (limitado a grilla)
        const from = startOfDay(a);
        const to = startOfDay(b);
        for (let d = new Date(from); d < to; d = addDays(d, 1)) {
          if (d < gridStart || d >= gridEnd) continue;
          bump(toYmd(d), "reservas");
        }
      }

      for (const bl of bloqueos) {
        const a = bl.data.desde.toDate();
        const b = bl.data.hasta.toDate();
        const from = startOfDay(a);
        const to = startOfDay(b);
        for (let d = new Date(from); d < to; d = addDays(d, 1)) {
          if (d < gridStart || d >= gridEnd) continue;
          bump(toYmd(d), "bloqueos");
        }
      }

      return map;
    }, [bloqueos, cursorMonth, reservas]);

    const monthLabel = useMemo(() => {
      return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(cursorMonth);
    }, [cursorMonth]);

    const weekdayLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;

    const monthGridDays = useMemo(() => {
      const monthStart = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1);
      const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7)); // lunes
      return Array.from({ length: 42 }, (_, i) => startOfDay(addDays(gridStart, i)));
    }, [cursorMonth]);

    const weekDays = useMemo(() => {
      const d = selectedDate;
      const mondayOffset = ((d.getDay() + 6) % 7) * -1;
      const monday = startOfDay(addDays(d, mondayOffset));
      return Array.from({ length: 7 }, (_, i) => startOfDay(addDays(monday, i)));
    }, [selectedDate]);

    const selectedDateLabel = useMemo(() => {
      return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(selectedDate);
    }, [selectedDate]);

    const movimientos = useMemo(() => {
      const ymd = toYmd(selectedDate);
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const checkMoves = reservas.filter((r) => {
        const ci = r.data.checkin.toDate();
        const co = r.data.checkout.toDate();
        const isCheckin = sameYmd(ci, selectedDate);
        const isCheckout = sameYmd(co, selectedDate);
        const overlapsDay = overlaps(ci, co, dayStart, dayEnd);
        return { hoy: isCheckin || isCheckout, overlapsDay }[movTab === "hoy" ? "hoy" : "overlapsDay"];
      });

      const listHoy = reservas.filter((r) => {
        const ci = r.data.checkin.toDate();
        const co = r.data.checkout.toDate();
        return sameYmd(ci, selectedDate) || sameYmd(co, selectedDate);
      });

      const listTodas = reservas.filter((r) => {
        const ci = r.data.checkin.toDate();
        const co = r.data.checkout.toDate();
        return overlaps(ci, co, dayStart, dayEnd);
      });

      const listBloqueos = bloqueos.filter((b) =>
        overlaps(b.data.desde.toDate(), b.data.hasta.toDate(), dayStart, dayEnd),
      );

      return { ymd, listHoy, listTodas, listBloqueos, checkMoves };
    }, [bloqueos, movTab, reservas, selectedDate]);

    const spaceDetail = useMemo(() => {
      if (!selectedSpace) return null;
      const key = `${selectedSpace.plantaId}/${selectedSpace.espacioId}` as EspacioKey;
      const name = espacioNameByKey.get(key);
      const camas = camasByEspacio[key] ?? [];
      const reservasEnEspacio = reservas.filter(
        (r) =>
          r.data.plantaId === selectedSpace.plantaId &&
          r.data.espacioId === selectedSpace.espacioId &&
          overlaps(r.data.checkin.toDate(), r.data.checkout.toDate(), startOfDay(selectedDate), endOfDay(selectedDate)),
      );
      const pendientes = reservasEnEspacio.filter((r) => r.data.estado === "pendiente");
      return { key, name, camas, reservasEnEspacio, pendientes };
    }, [camasByEspacio, espacioNameByKey, reservas, selectedDate, selectedSpace]);

    async function setReservaEstado(reservaId: Id, next: ReservaEstado) {
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

    async function onBloquearFechas() {
      if (!hostelId) return;
      if (!selectedSpace) return;
      const desde = parseYmd(blockDesde);
      const hasta = parseYmd(blockHasta);
      if (!desde || !hasta) {
        setError("Completá las fechas del bloqueo.");
        return;
      }
      if (hasta <= desde) {
        setError("La fecha 'hasta' debe ser posterior a 'desde'.");
        return;
      }

      // Bloqueo por habitación: si hay camas, bloqueamos todas las camas del espacio (una doc por cama).
      const spaceKey = `${selectedSpace.plantaId}/${selectedSpace.espacioId}` as EspacioKey;
      const camas = camasByEspacio[spaceKey] ?? [];
      const camasActivas = camas.filter((c) => c.data.activo !== false);
      if (camasActivas.length === 0) {
        setError("No hay camas activas para bloquear en este espacio.");
        return;
      }

      setBusy(true);
      setError(null);
      try {
        for (const cama of camasActivas) {
          await addDoc(bloqueosCollection(hostelId), {
            plantaId: selectedSpace.plantaId,
            espacioId: selectedSpace.espacioId,
            camaId: cama.id,
            desde: Timestamp.fromDate(desde),
            hasta: Timestamp.fromDate(hasta),
            motivo: blockMotivo.trim(),
          } satisfies Bloqueo);
        }
        setBlockOpen(false);
        setBlockMotivo("");
        setBlockDesde(toYmd(selectedDate));
        setBlockHasta(toYmd(addDays(selectedDate, 1)));
        void reload();
      } catch (e: unknown) {
        setError(errorMessage(e, "Error creando bloqueo"));
      } finally {
        setBusy(false);
      }
    }

    if (loading || !hostelId) return <PageSkeleton variant="calendario" />;

    return (
      <div className="space-y-5 text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Calendario
            </h1>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">{selectedDateLabel}</p>
          </div>
        </div>

        {loadError || error ? (
          <div
            className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3 text-sm"
            style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
          >
            {loadError ?? error}
          </div>
        ) : null}

        {/* Mitad y mitad */}
        <section
          className="
            relative grid gap-5 rounded-2xl border border-[var(--border-secondary)]
            bg-[var(--bg-component)] p-4 shadow-sm
          "
          style={{
            gridTemplateColumns: spacePanelOpen
              ? "minmax(0, 1fr) minmax(0, 1fr) 420px"
              : "minmax(0, 1fr) minmax(0, 1fr)",
          }}
        >
          {/* Izquierda: calendario */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === "mes") {
                      const d = new Date(cursorMonth);
                      d.setMonth(d.getMonth() - 1);
                      d.setDate(1);
                      setCursorMonth(startOfDay(d));
                    } else {
                      setSelectedDate((prev) => startOfDay(addDays(prev, -7)));
                    }
                  }}
                  className="
                    inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-secondary)]
                    bg-[var(--bg-page)] text-[var(--text-primary)] transition hover:bg-[var(--bg-list)]
                  "
                  aria-label="Anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === "mes") {
                      const d = new Date(cursorMonth);
                      d.setMonth(d.getMonth() + 1);
                      d.setDate(1);
                      setCursorMonth(startOfDay(d));
                    } else {
                      setSelectedDate((prev) => startOfDay(addDays(prev, 7)));
                    }
                  }}
                  className="
                    inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-secondary)]
                    bg-[var(--bg-page)] text-[var(--text-primary)] transition hover:bg-[var(--bg-list)]
                  "
                  aria-label="Siguiente"
                >
                  →
                </button>
                <div className="ml-2 text-sm font-semibold text-[var(--text-primary)]">
                  {viewMode === "mes" ? monthLabel : "Semana"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("mes")}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    viewMode === "mes"
                      ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                      : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)]",
                  )}
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("semana")}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    viewMode === "semana"
                      ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                      : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)]",
                  )}
                >
                  Semana
                </button>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setSelectedDate(startOfDay(new Date()));
                    const d = new Date();
                    d.setDate(1);
                    setCursorMonth(startOfDay(d));
                  }}
                  className="px-3 py-2"
                >
                  Hoy
                </SecondaryButton>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3">
              <div className="grid grid-cols-7 gap-1">
                {weekdayLabels.map((w) => (
                  <div
                    key={w}
                    className="px-2 py-1 text-center text-xs font-semibold text-[var(--text-tertiary)]"
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {(viewMode === "mes" ? monthGridDays : weekDays).map((d) => {
                  const inMonth = d.getMonth() === cursorMonth.getMonth();
                  const isToday = sameYmd(d, today);
                  const isSelected = sameYmd(d, selectedDate);
                  const act = activityByYmd.get(toYmd(d));
                  const hasAct = (act?.reservas ?? 0) > 0 || (act?.bloqueos ?? 0) > 0;

                  return (
                    <button
                      key={toYmd(d)}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d);
                        if (viewMode === "mes") {
                          // si el usuario clickea un día fuera del mes visible, mover el cursor
                          if (d.getMonth() !== cursorMonth.getMonth()) {
                            const x = new Date(d);
                            x.setDate(1);
                            setCursorMonth(startOfDay(x));
                          }
                        }
                      }}
                      className={cx(
                        "relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm transition",
                        isSelected ? "border-[var(--border-primary)]" : "border-transparent",
                        "hover:bg-[var(--bg-list)]",
                        isToday ? "bg-[var(--bg-accent)] text-[var(--text-button)]" : "bg-transparent",
                        !inMonth && viewMode === "mes" ? "opacity-50" : "",
                      )}
                      style={isToday ? { backgroundColor: "var(--bg-accent)" } : undefined}
                    >
                      <div className={cx("text-sm", isToday ? "font-semibold" : "text-[var(--text-primary)]")}>
                        {d.getDate()}
                      </div>
                      {hasAct ? (
                        <div className="absolute bottom-1 flex items-center justify-center">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                (act?.bloqueos ?? 0) > 0 ? "rgb(234, 179, 8)" : "rgb(59, 130, 246)",
                            }}
                          />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "rgb(59, 130, 246)" }} />
                  Reservas
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "rgb(234, 179, 8)" }} />
                  Bloqueos
                </div>
              </div>
            </div>
          </div>

          {/* Derecha: mapa hostel */}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Estado del hostel — {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(selectedDate)}
                </div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Click en una habitación para ver detalle.
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {plantas.map((planta) => {
                const espacios = espaciosByPlanta[planta.id] ?? [];
                return (
                  <div
                    key={planta.id}
                    className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      {planta.data.nombre || "Planta"}
                    </div>

                    <div className="mt-3 space-y-2">
                      {espacios.length === 0 ? (
                        <div className="text-sm text-[var(--text-tertiary)]">Sin espacios.</div>
                      ) : (
                        espacios.map((espacio) => {
                          const key = `${planta.id}/${espacio.id}` as EspacioKey;
                          const camas = camasByEspacio[key] ?? [];

                          return (
                            <div
                              key={espacio.id}
                              className="
                                flex items-start justify-between gap-3 rounded-xl border border-[var(--border-secondary)]
                                bg-[var(--bg-component)] p-3
                              "
                            >
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpace({ plantaId: planta.id, espacioId: espacio.id });
                                    setSpacePanelOpen(true);
                                    setSpacePanelTab("estado");
                                    setBlockDesde(toYmd(selectedDate));
                                    setBlockHasta(toYmd(addDays(selectedDate, 1)));
                                  }}
                                  className="text-left"
                                >
                                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                    {espacio.data.nombre || "Espacio"}
                                  </div>
                                  <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                    {espacio.data.tipo} · {camas.length} cama(s)
                                  </div>
                                </button>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {camas.length === 0 ? (
                                    <div className="text-xs text-[var(--text-tertiary)]">Sin camas.</div>
                                  ) : (
                                    camas.map((c) => {
                                      const status = getCamaStatus({
                                        plantaId: planta.id,
                                        espacioId: espacio.id,
                                        cama: c,
                                        date: selectedDate,
                                      });
                                      return (
                                        <span
                                          key={c.id}
                                          title={`${c.data.nombre || c.id} · ${status}`}
                                          className="h-4 w-4 rounded-md border border-black/10"
                                          style={{ backgroundColor: camaStatusColor(status) }}
                                        />
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <SecondaryButton
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpace({ plantaId: planta.id, espacioId: espacio.id });
                                    setNewReservaInitialBedKey(undefined);
                                    setNewReservaInitialEspacioKey(
                                      `${planta.id}/${espacio.id}` as EspacioKey,
                                    );
                                    setNewReservaOpen(true);
                                  }}
                                  className="px-3 py-2"
                                >
                                  + Reservar
                                </SecondaryButton>
                                <SecondaryButton
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpace({ plantaId: planta.id, espacioId: espacio.id });
                                    setSpacePanelOpen(true);
                                    setSpacePanelTab("estado");
                                    setBlockDesde(toYmd(selectedDate));
                                    setBlockHasta(toYmd(addDays(selectedDate, 1)));
                                    setBlockOpen(true);
                                  }}
                                  className="px-3 py-2"
                                >
                                  Bloquear fechas
                                </SecondaryButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel lateral de detalle habitación */}
          {spacePanelOpen && spaceDetail ? (
              <div
                className="
                  min-w-0 overflow-auto
                  rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] shadow-xl
                "
                style={{ maxHeight: "600px" }}
              >
                <div className="flex items-start justify-between border-b border-[var(--border-secondary)] px-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {spaceDetail.name
                        ? `${spaceDetail.name.plantaName} · ${spaceDetail.name.espacioName}`
                        : "Habitación"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                      Fecha: {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(selectedDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpacePanelOpen(false)}
                    className="rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-list)]"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="px-4 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "estado", label: "Estado" },
                        { id: "reservas", label: "Reservas" },
                        { id: "pendientes", label: "Pendientes" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSpacePanelTab(t.id)}
                        className={cx(
                          "rounded-xl border px-3 py-2 text-sm transition",
                          spacePanelTab === t.id
                            ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                            : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)]",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 pb-4 pt-4">
                  {spacePanelTab === "estado" ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                          Camas
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          {spaceDetail.camas.length === 0 ? (
                            <div className="text-sm text-[var(--text-tertiary)]">Sin camas.</div>
                          ) : (
                            spaceDetail.camas.map((c) => {
                              const status = getCamaStatus({
                                plantaId: selectedSpace!.plantaId,
                                espacioId: selectedSpace!.espacioId,
                                cama: c,
                                date: selectedDate,
                              });
                              return (
                                <div
                                  key={c.id}
                                  className="
                                    flex items-center justify-between gap-3 rounded-xl
                                    border border-[var(--border-secondary)] bg-[var(--bg-component)] p-3
                                  "
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                                      {c.data.nombre || "Cama"}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                      ID: {c.id}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: camaStatusColor(status) }}
                                    />
                                    <span className="text-xs text-[var(--text-secondary)]">{status}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setNewReservaInitialEspacioKey(
                              selectedSpace
                                ? (`${selectedSpace.plantaId}/${selectedSpace.espacioId}` as EspacioKey)
                                : undefined,
                            );
                            setNewReservaOpen(true);
                          }}
                        >
                          + Reservar
                        </SecondaryButton>
                        <SecondaryButton type="button" onClick={() => setBlockOpen(true)}>
                          Bloquear fechas
                        </SecondaryButton>
                      </div>
                    </div>
                  ) : null}

                  {spacePanelTab === "reservas" ? (
                    <div className="space-y-2">
                      <div className="mb-3">
                        <PrimaryButton
                          type="button"
                          onClick={() => {
                            setNewReservaInitialEspacioKey(
                              selectedSpace
                                ? (`${selectedSpace.plantaId}/${selectedSpace.espacioId}` as EspacioKey)
                                : undefined,
                            );
                            setNewReservaOpen(true);
                          }}
                          className="w-full"
                        >
                          + Nueva reserva en esta habitación
                        </PrimaryButton>
                      </div>
                      {spaceDetail.reservasEnEspacio.length === 0 ? (
                        <div className="text-sm text-[var(--text-tertiary)]">
                          No hay reservas que cubran esta fecha en esta habitación.
                        </div>
                      ) : (
                        spaceDetail.reservasEnEspacio.map((r) => {
                          const huesped = r.data.huesped;
                          const colors = reservaBadgeColors(r.data.estado);
                          return (
                            <div
                              key={r.id}
                              className="
                                rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3
                              "
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                    {huesped?.nombre || "Huésped"}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                                    {r.data.checkin.toDate().toLocaleDateString("es-AR")}
                                    {" → "}
                                    {r.data.checkout.toDate().toLocaleDateString("es-AR")}
                                  </div>
                                </div>
                                <span
                                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                                  style={{ backgroundColor: colors.bg, color: colors.fg }}
                                >
                                  {reservaEstadoLabel(r.data.estado)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {r.data.estado === "confirmada" ? (
                                  <PrimaryButton
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void setReservaEstado(r.id, "en_curso")}
                                    className="px-3 py-2"
                                  >
                                    Check-in
                                  </PrimaryButton>
                                ) : null}
                                {r.data.estado === "en_curso" ? (
                                  <PrimaryButton
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void setReservaEstado(r.id, "completada")}
                                    className="px-3 py-2"
                                  >
                                    Check-out
                                  </PrimaryButton>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}

                  {spacePanelTab === "pendientes" ? (
                    <div className="space-y-2">
                      {spaceDetail.pendientes.length === 0 ? (
                        <div className="text-sm text-[var(--text-tertiary)]">
                          No hay pendientes para esta habitación en esta fecha.
                        </div>
                      ) : (
                        spaceDetail.pendientes.map((r) => (
                          <div
                            key={r.id}
                            className="
                              rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3
                            "
                          >
                            <div className="text-sm font-semibold text-[var(--text-primary)]">
                              {r.data.huesped?.nombre || "Huésped"}
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                              {r.data.checkin.toDate().toLocaleDateString("es-AR")}
                              {" → "}
                              {r.data.checkout.toDate().toLocaleDateString("es-AR")}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <PrimaryButton
                                type="button"
                                disabled={busy}
                                onClick={() => void setReservaEstado(r.id, "confirmada")}
                                className="px-3 py-2"
                              >
                                Confirmar
                              </PrimaryButton>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
          ) : null}
        </section>

        {/* Abajo: movimientos */}
        <section
          className="
            rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Movimientos — {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(selectedDate)}
              </div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                {movTab === "hoy"
                  ? "Check-ins y check-outs del día."
                  : movTab === "todas"
                    ? "Reservas que cubren la fecha seleccionada."
                    : "Bloqueos que cubren la fecha seleccionada."}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "hoy", label: "Movimientos de hoy" },
                  { id: "todas", label: "Todas las reservas" },
                  { id: "bloqueadas", label: "Bloqueadas" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMovTab(t.id)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    movTab === t.id
                      ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                      : "border-[var(--border-secondary)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-list)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)]">
            {movTab !== "bloqueadas" ? (
              <div className="divide-y divide-[var(--border-secondary)]">
                {(movTab === "hoy" ? movimientos.listHoy : movimientos.listTodas).length === 0 ? (
                  <div className="p-4 text-sm text-[var(--text-tertiary)]">Sin movimientos.</div>
                ) : (
                  (movTab === "hoy" ? movimientos.listHoy : movimientos.listTodas).map((r) => {
                    const huesped = r.data.huesped;
                    const key = `${r.data.plantaId}/${r.data.espacioId}` as EspacioKey;
                    const space = espacioNameByKey.get(key);
                    const colors = reservaBadgeColors(r.data.estado);
                    const ci = r.data.checkin.toDate();
                    const co = r.data.checkout.toDate();
                    const isCI = sameYmd(ci, selectedDate);
                    const isCO = sameYmd(co, selectedDate);

                    const action =
                      isCI && r.data.estado === "confirmada"
                        ? { label: "Check-in", next: "en_curso" as const }
                        : isCO && r.data.estado === "en_curso"
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
                              {space ? `${space.plantaName} · ${space.espacioName}` : key}
                              {" · "}
                              {isCI ? "Check-in" : isCO ? "Check-out" : "En estadía"}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ backgroundColor: colors.bg, color: colors.fg }}
                          >
                            {reservaEstadoLabel(r.data.estado)}
                          </span>
                          {action ? (
                            <PrimaryButton
                              type="button"
                              disabled={busy}
                              onClick={() => void setReservaEstado(r.id, action.next)}
                              className="px-3 py-2"
                            >
                              {action.label}
                            </PrimaryButton>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-secondary)]">
                {movimientos.listBloqueos.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--text-tertiary)]">Sin bloqueos.</div>
                ) : (
                  movimientos.listBloqueos.map((b) => {
                    const key = `${b.data.plantaId}/${b.data.espacioId}` as EspacioKey;
                    const space = espacioNameByKey.get(key);
                    return (
                      <div key={b.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {space ? `${space.plantaName} · ${space.espacioName}` : key}
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                              {b.data.desde.toDate().toLocaleDateString("es-AR")}
                              {" → "}
                              {b.data.hasta.toDate().toLocaleDateString("es-AR")}
                              {" · "}
                              Cama: {camaNameById.get(b.data.camaId) ?? b.data.camaId}
                            </div>
                            {b.data.motivo?.trim() ? (
                              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                                {b.data.motivo}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor: "rgba(133, 77, 14, 0.55)",
                                color: "rgb(253, 230, 138)",
                              }}
                            >
                              Bloqueada
                            </span>
                            <button
                              type="button"
                              disabled={deletingBloqueoId !== null}
                              onClick={() => void eliminarBloqueo(b.id)}
                              title="Eliminar bloqueo"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)] disabled:opacity-50"
                            >
                              {deletingBloqueoId === b.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>

        <NuevaReservaModal
          open={newReservaOpen}
          onClose={() => {
            setNewReservaOpen(false);
            setNewReservaInitialBedKey(undefined);
            setNewReservaInitialEspacioKey(undefined);
          }}
          camasByEspacio={camasByEspacio as unknown as Record<ModalEspacioKey, ModalCamaNode[]>}
          espacioNameByKey={
            espacioNameByKey as unknown as Map<
              ModalEspacioKey,
              { plantaName: string; espacioName: string }
            >
          }
          reservas={reservas as unknown as ModalReservaNode[]}
          defaultCheckin={selectedDate}
          initialBedKey={newReservaInitialBedKey}
          initialEspacioKey={newReservaInitialEspacioKey}
        />

        {/* Modal: Bloquear fechas */}
        <Modal
          open={blockOpen}
          title="Bloquear fechas"
          onClose={() => {
            setBlockOpen(false);
            setBlockMotivo("");
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-medium text-[var(--text-secondary)]">Desde</div>
                <div className="mt-1">
                  <TextInput type="date" value={blockDesde} onChange={(e) => setBlockDesde(e.target.value)} />
                </div>
              </label>
              <label className="block">
                <div className="text-xs font-medium text-[var(--text-secondary)]">Hasta</div>
                <div className="mt-1">
                  <TextInput type="date" value={blockHasta} onChange={(e) => setBlockHasta(e.target.value)} />
                </div>
              </label>
            </div>

            <label className="block">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Motivo</div>
              <div className="mt-1">
                <TextInput
                  placeholder="Ej: mantenimiento, reparación, reservado por grupo…"
                  value={blockMotivo}
                  onChange={(e) => setBlockMotivo(e.target.value)}
                />
              </div>
            </label>

            <div className="flex items-center justify-between gap-3">
              <SecondaryButton type="button" onClick={() => setBlockOpen(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton type="button" disabled={busy} onClick={() => void onBloquearFechas()}>
                {busy ? "Guardando..." : "Guardar bloqueo"}
              </PrimaryButton>
            </div>

            <div className="text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.9 }}>
              Se guarda como bloqueo para <span className="font-medium">cada cama activa</span> de la habitación seleccionada.
            </div>
          </div>
        </Modal>
      </div>
    );
  }

