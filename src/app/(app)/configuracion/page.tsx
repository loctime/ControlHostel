"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Cama,
  CamaEstado,
  Espacio,
  EspacioTipo,
  Hostel,
  Planta,
} from "@/lib/db";
import { postHostelWrite } from "@/lib/hostel-config-api";
import { useHostelSnapshot } from "@/lib/hostel-snapshot-client";
import { PageSkeleton } from "@/components/PageSkeleton";

type Id = string;

type PlantaNode = { id: Id; data: Planta };
type EspacioNode = { id: Id; data: Espacio };
type CamaNode = { id: Id; data: Cama & { activo?: boolean } };

type Selection =
  | { kind: "hostel" }
  | { kind: "planta"; plantaId: Id }
  | { kind: "espacio"; plantaId: Id; espacioId: Id }
  | { kind: "cama"; plantaId: Id; espacioId: Id; camaId: Id };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  return fallback;
}

function asNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function defaultCamaEstado(): CamaEstado {
  return "libre";
}

const PLANTA_COLORES = [
  { id: "teal", bg: "#5eead4", text: "#134e4a", bgSuave: "#99f6e4", bgMuySuave: "#ccfbf1" },
  { id: "azul", bg: "#60a5fa", text: "#1e3a8a", bgSuave: "#93c5fd", bgMuySuave: "#bfdbfe" },
  { id: "verde", bg: "#4ade80", text: "#14532d", bgSuave: "#86efac", bgMuySuave: "#bbf7d0" },
  { id: "amarillo", bg: "#fde047", text: "#713f12", bgSuave: "#fef08a", bgMuySuave: "#fef9c3" },
  { id: "salmon", bg: "#fb923c", text: "#7c2d12", bgSuave: "#fdba74", bgMuySuave: "#fed7aa" },
  { id: "ambar", bg: "#fbbf24", text: "#78350f", bgSuave: "#fcd34d", bgMuySuave: "#fde68a" },
  { id: "lavanda", bg: "#a78bfa", text: "#2e1065", bgSuave: "#c4b5fd", bgMuySuave: "#ddd6fe" },
  { id: "rosa", bg: "#f472b6", text: "#500724", bgSuave: "#f9a8d4", bgMuySuave: "#fbcfe8" },
  { id: "violeta", bg: "#818cf8", text: "#1e1b4b", bgSuave: "#a5b4fc", bgMuySuave: "#c7d2fe" },
] as const;

type PlantaColorId = (typeof PLANTA_COLORES)[number]["id"];

function getPlantaColor(colorId?: string): (typeof PLANTA_COLORES)[number] | null {
  return PLANTA_COLORES.find((c) => c.id === colorId) ?? null;
}

const TREE_CARD_ROW =
  "flex w-full items-center gap-2 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] px-3 py-2 text-left transition hover:bg-[var(--bg-list)]";
const TREE_CARD_ROW_SELECTED = "border-[var(--border-primary)] bg-[var(--bg-list)]";

const CAMA_ESTADOS: Array<{ id: CamaEstado; label: string }> = [
  { id: "libre", label: "Libre" },
  { id: "ocupada", label: "Ocupada" },
  { id: "bloqueada", label: "Bloqueada" },
  { id: "fuera_de_servicio", label: "Fuera de servicio" },
];

const ESPACIO_TIPOS: Array<{ id: EspacioTipo; label: string }> = [
  { id: "privada", label: "Privada" },
  { id: "compartido", label: "Compartido" },
  { id: "comun", label: "Común" },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1">{children}</div>
      {hint ? (
        <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.9 }}>
          {hint}
        </div>
      ) : null}
    </label>
  );
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="
        inline-flex items-center gap-2 rounded-xl border border-[var(--border-secondary)]
        bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] transition
        hover:bg-[var(--bg-list)]
      "
      aria-pressed={checked}
    >
      <span
        className={cx(
          "h-4 w-7 rounded-full border border-[var(--border-secondary)] p-[2px] transition",
          checked ? "bg-[var(--bg-accent)]" : "bg-[var(--bg-component)]",
        )}
      >
        <span
          className={cx(
            "block h-3 w-3 rounded-full bg-white transition",
            checked ? "translate-x-3" : "translate-x-0",
          )}
          style={{ willChange: "transform" }}
        />
      </span>
      <span>{label}</span>
    </button>
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

type TreeAddForm =
  | null
  | { kind: "planta" }
  | { kind: "espacio"; plantaId: Id }
  | { kind: "cama"; plantaId: Id; espacioId: Id };

function TreeAddNombreInline({
  nombre,
  onNombreChange,
  onConfirm,
  onCancel,
  busy,
  placeholder,
}: {
  nombre: string;
  onNombreChange: (v: string) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy: boolean;
  placeholder?: string;
}) {
  return (
    <div
      className="
        rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-2 shadow-sm
      "
    >
      <label className="block text-xs font-medium text-[var(--text-secondary)]">Nombre</label>
      <TextInput
        className="mt-1 py-1.5 text-sm"
        value={nombre}
        onChange={(e) => onNombreChange(e.target.value)}
        placeholder={placeholder ?? "Nombre"}
        disabled={busy}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onConfirm();
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <PrimaryButton
          type="button"
          className="px-3 py-1.5 text-xs"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? "Creando..." : "Crear"}
        </PrimaryButton>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="
            rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]
            transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
            disabled:opacity-50
          "
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const {
    hostelId,
    hostel,
    plantas,
    espaciosByPlanta,
    camasByEspacio,
    loadError,
    loading,
    reload,
  } = useHostelSnapshot({ pollMs: false });

  const [expandedPlantas, setExpandedPlantas] = useState<Record<Id, boolean>>({});
  const [expandedEspacios, setExpandedEspacios] = useState<Record<string, boolean>>({});

  const [selection, setSelection] = useState<Selection>({ kind: "hostel" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeAddForm, setTreeAddForm] = useState<TreeAddForm>(null);
  const [treeAddNombre, setTreeAddNombre] = useState("");
  const [newPlantaColor, setNewPlantaColor] = useState<PlantaColorId | "">("");

  const syncData = () => void reload();

  const selectedPlantaId =
    selection.kind === "planta"
      ? selection.plantaId
      : selection.kind === "espacio"
        ? selection.plantaId
        : selection.kind === "cama"
          ? selection.plantaId
          : null;

  const selectedEspacioId =
    selection.kind === "espacio"
      ? selection.espacioId
      : selection.kind === "cama"
        ? selection.espacioId
        : null;

  const selectedCamaId = selection.kind === "cama" ? selection.camaId : null;

  const selectedPlanta = useMemo(() => {
    if (!selectedPlantaId) return null;
    return plantas.find((p) => p.id === selectedPlantaId) ?? null;
  }, [plantas, selectedPlantaId]);

  const selectedEspacio = useMemo(() => {
    if (!selectedPlantaId || !selectedEspacioId) return null;
    return (espaciosByPlanta[selectedPlantaId] ?? []).find((e) => e.id === selectedEspacioId) ?? null;
  }, [espaciosByPlanta, selectedEspacioId, selectedPlantaId]);

  const selectedCama = useMemo(() => {
    if (!selectedPlantaId || !selectedEspacioId || !selectedCamaId) return null;
    const key = `${selectedPlantaId}/${selectedEspacioId}`;
    return (camasByEspacio[key] ?? []).find((c) => c.id === selectedCamaId) ?? null;
  }, [camasByEspacio, selectedCamaId, selectedEspacioId, selectedPlantaId]);

  const panelColor = useMemo(() => {
    if (selection.kind === "hostel") return null;
    return getPlantaColor(selectedPlanta?.data.color);
  }, [selection.kind, selectedPlanta]);

  useEffect(() => {
    setSelection((prev) => {
      if (prev.kind === "planta") {
        if (!plantas.some((p) => p.id === prev.plantaId)) return { kind: "hostel" };
      }
      if (prev.kind === "espacio") {
        const esp = espaciosByPlanta[prev.plantaId] ?? [];
        if (!esp.some((e) => e.id === prev.espacioId)) return { kind: "hostel" };
      }
      if (prev.kind === "cama") {
        const key = `${prev.plantaId}/${prev.espacioId}`;
        const camas = camasByEspacio[key] ?? [];
        if (!camas.some((c) => c.id === prev.camaId)) return { kind: "hostel" };
      }
      return prev;
    });
  }, [plantas, espaciosByPlanta, camasByEspacio]);

  function togglePlanta(plantaId: Id) {
    setExpandedPlantas((prev) => ({ ...prev, [plantaId]: !prev[plantaId] }));
  }

  function toggleEspacio(plantaId: Id, espacioId: Id) {
    const key = `${plantaId}/${espacioId}`;
    setExpandedEspacios((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function cancelTreeAdd() {
    setTreeAddForm(null);
    setNewPlantaColor("");
    setError(null);
  }

  async function confirmTreeAdd() {
    if (!treeAddForm) return;
    const nombre = treeAddNombre.trim();
    if (!nombre && treeAddForm?.kind !== "cama") {
      setError("Escribí un nombre para crear el elemento.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (treeAddForm.kind === "planta") {
        const maxOrden = plantas.reduce((max, p) => Math.max(max, p.data.orden ?? 0), 0);
        const colorTrim = newPlantaColor.trim();
        const { id } = await postHostelWrite({
          op: "addPlanta",
          payload: {
            nombre,
            orden: maxOrden + 1,
            color: colorTrim,
          } satisfies Planta,
        });
        await reload();
        setTreeAddForm(null);
        setNewPlantaColor("");
        if (id) {
          setExpandedPlantas((prev) => ({ ...prev, [id]: true }));
          setSelection({ kind: "planta", plantaId: id });
        }
      } else if (treeAddForm.kind === "espacio") {
        const plantaId = treeAddForm.plantaId;
        const { id } = await postHostelWrite({
          op: "addEspacio",
          payload: {
            plantaId,
            nombre,
            tipo: "compartido",
            precio: 0,
            activo: true,
          } satisfies Espacio & { plantaId: string },
        });
        await reload();
        setTreeAddForm(null);
        if (id) {
          setExpandedPlantas((prev) => ({ ...prev, [plantaId]: true }));
          setExpandedEspacios((prev) => ({ ...prev, [`${plantaId}/${id}`]: true }));
          setSelection({ kind: "espacio", plantaId, espacioId: id });
        }
      } else {
        const { plantaId, espacioId } = treeAddForm;
        const { id } = await postHostelWrite({
          op: "addCama",
          payload: {
            plantaId,
            espacioId,
            nombre,
            estado: defaultCamaEstado(),
            activo: true,
          },
        });
        await reload();
        setTreeAddForm(null);
        if (id) {
          setExpandedPlantas((prev) => ({ ...prev, [plantaId]: true }));
          setExpandedEspacios((prev) => ({ ...prev, [`${plantaId}/${espacioId}`]: true }));
          setSelection({ kind: "cama", plantaId, espacioId, camaId: id });
        }
      }
    } catch (e: unknown) {
      const msg =
        treeAddForm.kind === "planta"
          ? "Error creando planta"
          : treeAddForm.kind === "espacio"
            ? "Error creando espacio"
            : "Error creando cama";
      setError(errorMessage(e, msg));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (treeAddForm?.kind !== "cama") return;
    void confirmTreeAdd();
  }, [treeAddForm]);

  const treeHostelTitle = hostel?.nombre?.trim() ? hostel.nombre : "Hostel";
  const treeHostelSubtitle = hostel?.direccion?.trim() ? hostel.direccion : "Sin dirección";

  if (loading || !hostelId) return <PageSkeleton variant="configuracion" />;

  return (
    <div className="text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      <div
        className="
          grid gap-6
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4
          shadow-lg
        "
        style={{ gridTemplateColumns: "260px 1fr" }}
      >
        <aside
          className="
            rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-sidebar)] p-3
            shadow-md
          "
        >
          <button
            type="button"
            onClick={() => setSelection({ kind: "hostel" })}
            className={cx(
              "w-full rounded-xl border px-3 py-2 text-left transition",
              selection.kind === "hostel"
                ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                : "border-transparent hover:bg-[var(--bg-list)]",
            )}
          >
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {treeHostelTitle}
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{treeHostelSubtitle}</div>
          </button>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Estructura
            </div>

            <div className="space-y-2">
              {plantas.map((planta) => {
                const plantaColorObj = getPlantaColor(planta.data.color);
                const isExpanded = !!expandedPlantas[planta.id];
                const isSelected = selection.kind === "planta" && selection.plantaId === planta.id;
                const espacios = espaciosByPlanta[planta.id] ?? [];

                return (
                  <div key={planta.id}>
                    <button
                      type="button"
                      onClick={() => {
                        togglePlanta(planta.id);
                        setSelection({ kind: "planta", plantaId: planta.id });
                      }}
                      className={cx(TREE_CARD_ROW, isSelected && TREE_CARD_ROW_SELECTED)}
                      style={
                        plantaColorObj
                          ? {
                              background: plantaColorObj.bg,
                              border: "none",
                              color: plantaColorObj.text,
                            }
                          : undefined
                      }
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Colapsar planta" : "Expandir planta"}
                    >
                      <span
                        className={cx(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center text-base",
                          plantaColorObj ? "opacity-70" : "text-[var(--text-secondary)]",
                        )}
                        aria-hidden
                      >
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cx(
                            "text-sm font-medium",
                            !plantaColorObj && "text-[var(--text-primary)]",
                          )}
                        >
                          {planta.data.nombre || "Planta"}
                        </div>
                        <div
                          className={cx(
                            "mt-0.5 text-xs",
                            plantaColorObj ? "opacity-75" : "text-[var(--text-tertiary)]",
                          )}
                        >
                          Orden: {planta.data.orden}
                        </div>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div
                        className="ml-2 mt-2 space-y-2 border-l-[3px] border-solid border-[var(--border-secondary)] pl-3"
                        style={plantaColorObj ? { borderColor: plantaColorObj.text } : undefined}
                      >
                        {espacios.map((espacio) => {
                          const isEspacioSelected =
                            selection.kind === "espacio" &&
                            selection.plantaId === planta.id &&
                            selection.espacioId === espacio.id;
                          const isExpandedEspacio =
                            !!expandedEspacios[`${planta.id}/${espacio.id}`];
                          const camasKey = `${planta.id}/${espacio.id}`;
                          const camas = camasByEspacio[camasKey] ?? [];
                          const showCamasInTree = espacio.data.tipo !== "comun";

                          return (
                            <div key={espacio.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  toggleEspacio(planta.id, espacio.id);
                                  setSelection({
                                    kind: "espacio",
                                    plantaId: planta.id,
                                    espacioId: espacio.id,
                                  });
                                }}
                                className={cx(TREE_CARD_ROW, isEspacioSelected && TREE_CARD_ROW_SELECTED)}
                                style={
                                  plantaColorObj
                                    ? {
                                        background: plantaColorObj.bgSuave,
                                        border: "none",
                                        color: plantaColorObj.text,
                                      }
                                    : undefined
                                }
                                aria-expanded={isExpandedEspacio}
                                aria-label={isExpandedEspacio ? "Colapsar espacio" : "Expandir espacio"}
                              >
                                <span
                                  className={cx(
                                    "inline-flex h-7 w-7 shrink-0 items-center justify-center text-base",
                                    plantaColorObj ? "opacity-70" : "text-[var(--text-secondary)]",
                                  )}
                                  aria-hidden
                                >
                                  {isExpandedEspacio ? "▾" : "▸"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={cx(
                                      "text-sm font-medium",
                                      !plantaColorObj && "text-[var(--text-primary)]",
                                    )}
                                  >
                                    {espacio.data.nombre || "Espacio"}
                                  </div>
                                  <div
                                    className={cx(
                                      "mt-0.5 text-xs",
                                      plantaColorObj ? "opacity-75" : "text-[var(--text-tertiary)]",
                                    )}
                                  >
                                    {espacio.data.tipo} · ${espacio.data.precio ?? 0}
                                  </div>
                                </div>
                              </button>

                              {isExpandedEspacio ? (
                                <div
                                  className="ml-2 mt-2 space-y-2 border-l-[2px] border-solid border-[var(--border-secondary)] pl-3"
                                  style={plantaColorObj ? { borderColor: plantaColorObj.text } : undefined}
                                >
                                  {showCamasInTree ? (
                                    camas.map((cama) => {
                                      const isCamaSelected =
                                        selection.kind === "cama" &&
                                        selection.plantaId === planta.id &&
                                        selection.espacioId === espacio.id &&
                                        selection.camaId === cama.id;

                                      return (
                                        <button
                                          key={cama.id}
                                          type="button"
                                          onClick={() =>
                                            setSelection({
                                              kind: "cama",
                                              plantaId: planta.id,
                                              espacioId: espacio.id,
                                              camaId: cama.id,
                                            })
                                          }
                                          className={cx(
                                            TREE_CARD_ROW,
                                            isCamaSelected && TREE_CARD_ROW_SELECTED,
                                          )}
                                          style={
                                            plantaColorObj
                                              ? {
                                                  background: plantaColorObj.bgMuySuave,
                                                  border: "none",
                                                  color: plantaColorObj.text,
                                                }
                                              : undefined
                                          }
                                        >
                                          <div className="min-w-0 flex-1 pl-1">
                                            <div
                                              className={cx(
                                                "text-sm",
                                                !plantaColorObj && "text-[var(--text-primary)]",
                                              )}
                                            >
                                              {cama.data.nombre || "Cama"}
                                            </div>
                                            <div
                                              className={cx(
                                                "mt-0.5 text-xs",
                                                plantaColorObj ? "opacity-75" : "text-[var(--text-tertiary)]",
                                              )}
                                            >
                                              {cama.data.estado}
                                              {" · "}
                                              {cama.data.activo === false
                                                ? "No visible"
                                                : "Visible"}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-[var(--border-secondary)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
                                      Espacio común (sin camas)
                                    </div>
                                  )}

                                  {showCamasInTree ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        setTreeAddNombre("");
                                        setTreeAddForm({
                                          kind: "cama",
                                          plantaId: planta.id,
                                          espacioId: espacio.id,
                                        });
                                      }}
                                      className="
                                        w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                                        bg-[var(--bg-page)] px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                                        transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                                        disabled:opacity-50
                                      "
                                    >
                                      + Agregar cama
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {treeAddForm?.kind === "espacio" && treeAddForm.plantaId === planta.id ? (
                          <TreeAddNombreInline
                            nombre={treeAddNombre}
                            onNombreChange={setTreeAddNombre}
                            onConfirm={confirmTreeAdd}
                            onCancel={cancelTreeAdd}
                            busy={busy}
                            placeholder="Ej. Dormitorio A"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const count = (espaciosByPlanta[planta.id] ?? []).length;
                              setTreeAddForm({ kind: "espacio", plantaId: planta.id });
                              setTreeAddNombre(`Habitación ${count + 1}`);
                            }}
                            className="
                              w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                              bg-[var(--bg-page)] px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                              transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                              disabled:opacity-50
                            "
                          >
                            + Agregar espacio
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {treeAddForm?.kind === "planta" ? (
                <div className="space-y-2">
                  <TreeAddNombreInline
                    nombre={treeAddNombre}
                    onNombreChange={setTreeAddNombre}
                    onConfirm={confirmTreeAdd}
                    onCancel={cancelTreeAdd}
                    busy={busy}
                    placeholder="Ej. Planta baja"
                  />
                  <div
                    className="
                      rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-2 shadow-sm
                    "
                  >
                    <Field label="Color de planta">
                      <div className="flex flex-wrap gap-2">
                        {PLANTA_COLORES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNewPlantaColor(c.id)}
                            title={c.id}
                            disabled={busy}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: c.bg,
                              border:
                                newPlantaColor === c.id
                                  ? `3px solid ${c.text}`
                                  : "2px solid transparent",
                              cursor: busy ? "not-allowed" : "pointer",
                              outline: "none",
                              transition: "border 0.15s",
                            }}
                          />
                        ))}
                        {newPlantaColor ? (
                          <button
                            type="button"
                            onClick={() => setNewPlantaColor("")}
                            title="Sin color"
                            disabled={busy}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "var(--bg-page)",
                              border: "1.5px dashed var(--border-secondary)",
                              cursor: busy ? "not-allowed" : "pointer",
                              fontSize: 15,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    </Field>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTreeAddNombre("");
                    setNewPlantaColor("");
                    setTreeAddForm({ kind: "planta" });
                  }}
                  className="
                    mt-1 w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                    bg-[var(--bg-page)] px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                    transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                    disabled:opacity-50
                  "
                >
                  + Agregar planta
                </button>
              )}
            </div>
          </div>
        </aside>

        <section
          className="
            rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-5 shadow-sm
          "
        >
          {panelColor ? (
            <div
              style={{
                height: 4,
                borderRadius: "8px 8px 0 0",
                background: panelColor.bg,
                marginBottom: 16,
              }}
            />
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Configuración
              </h1>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Hostel:{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {hostel?.nombre?.trim() || "Sin nombre"}
                </span>
              </p>
            </div>
          </div>

          {loadError || error ? (
            <div
              className="mt-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3 text-sm"
              style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
            >
              {loadError ?? error}
            </div>
          ) : null}

          <div className="mt-5">
            {selection.kind === "hostel" ? (
              <HostelPanel
                hostelId={hostelId}
                hostel={hostel}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onDataSynced={syncData}
              />
            ) : null}

            {selection.kind === "planta" ? (
              <PlantaPanel
                hostelId={hostelId}
                planta={selectedPlanta}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onDeleted={() => setSelection({ kind: "hostel" })}
                onDataSynced={syncData}
              />
            ) : null}

            {selection.kind === "espacio" ? (
              <EspacioPanel
                hostelId={hostelId}
                planta={selectedPlanta}
                espacio={selectedEspacio}
                camas={(selectedPlantaId && selectedEspacioId
                  ? camasByEspacio[`${selectedPlantaId}/${selectedEspacioId}`]
                  : []) ?? []}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onDeleted={() => setSelection({ kind: "hostel" })}
                onDataSynced={syncData}
              />
            ) : null}

            {selection.kind === "cama" ? (
              <CamaPanel
                hostelId={hostelId}
                planta={selectedPlanta}
                espacio={selectedEspacio}
                cama={selectedCama}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onDeleted={() => setSelection({ kind: "hostel" })}
                onDataSynced={syncData}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function HostelPanel({
  hostelId,
  hostel,
  busy,
  setBusy,
  setError,
  onDataSynced,
}: {
  hostelId: string;
  hostel: Hostel | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [slugNombre, setSlugNombre] = useState("");

  useEffect(() => {
    setNombre(hostel?.nombre ?? "");
    setDireccion(hostel?.direccion ?? "");
    setDescripcion(hostel?.descripcion ?? "");
    setSlugNombre(hostel?.slugNombre ?? "");
  }, [hostel]);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "updateHostel",
        payload: {
          nombre: nombre.trim(),
          direccion: direccion.trim(),
          descripcion: descripcion.trim(),
          slugNombre: slugNombre.trim(),
        },
      });
      onDataSynced?.();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error guardando hostel"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Hostel</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Editá los datos generales del hostel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Dirección">
          <TextInput value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Descripción">
            <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="Nombre de tu página">
            <TextInput
              value={slugNombre}
              onChange={(e) => setSlugNombre(e.target.value)}
              placeholder="Ej. hostelpatagonia"
            />
          </Field>
          <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.9 }}>
            Tu landing estará en: /web/{slugNombre || "nombre"}[número asignado]
          </div>
          {hostel?.slug && (
             <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.9 }}>
               URL actual:{" "}
               <a
                 href={`/web/${hostel.slug}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="font-medium text-[var(--bg-accent)] underline hover:opacity-80"
               >
                 /web/{hostel.slug} ↗
               </a>
             </div>
           )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onSave()} disabled={busy}>
          {busy ? "Guardando..." : "Guardar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function PlantaPanel({
  hostelId,
  planta,
  busy,
  setBusy,
  setError,
  onDeleted,
  onDataSynced,
}: {
  hostelId: string;
  planta: PlantaNode | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onDeleted: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("0");
  const [color, setColor] = useState<PlantaColorId | "">("");

  useEffect(() => {
    setNombre(planta?.data.nombre ?? "");
    setOrden(String(planta?.data.orden ?? 0));
    const raw = planta?.data.color?.trim() ?? "";
    const next: PlantaColorId | "" = PLANTA_COLORES.some((c) => c.id === raw)
      ? (raw as PlantaColorId)
      : "";
    setColor(next);
  }, [planta]);

  async function onSave() {
    if (!planta) return;
    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "updatePlanta",
        payload: {
          plantaId: planta.id,
          nombre: nombre.trim(),
          orden: asNumber(orden, planta.data.orden ?? 0),
          color: color.trim(),
        } satisfies Planta & { plantaId: string },
      });
      onDataSynced?.();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error guardando planta"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!planta) return;
    const ok = confirm(
      `¿Eliminar la planta "${planta.data.nombre?.trim() || "sin nombre"}"?\n\nEsto eliminará su documento. (Si hay subcolecciones, Firestore no las borra automáticamente.)`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({ op: "deletePlanta", payload: { plantaId: planta.id } });
      onDataSynced?.();
      onDeleted();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error eliminando planta"));
    } finally {
      setBusy(false);
    }
  }

  if (!planta) {
    return (
      <div className="text-sm text-[var(--text-tertiary)]">
        Planta no encontrada (puede haber sido eliminada).
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {planta.data.nombre?.trim() ? planta.data.nombre : "Planta"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Orden" hint="Se usa para ordenar las plantas en el árbol.">
          <TextInput
            inputMode="numeric"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Color de planta">
            <div className="flex flex-wrap gap-2">
              {PLANTA_COLORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.id}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: c.bg,
                    border:
                      color === c.id ? `3px solid ${c.text}` : "2px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                    transition: "border 0.15s",
                  }}
                />
              ))}
              {color ? (
                <button
                  type="button"
                  onClick={() => setColor("")}
                  title="Sin color"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-page)",
                    border: "1.5px dashed var(--border-secondary)",
                    cursor: "pointer",
                    fontSize: 15,
                    color: "var(--text-tertiary)",
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onSave()} disabled={busy}>
          {busy ? "Guardando..." : "Guardar"}
        </PrimaryButton>
        <DangerButton type="button" onClick={() => void onDelete()} disabled={busy}>
          Eliminar
        </DangerButton>
      </div>
    </div>
  );
}

function EspacioPanel({
  hostelId,
  planta,
  espacio,
  camas,
  busy,
  setBusy,
  setError,
  onDeleted,
  onDataSynced,
}: {
  hostelId: string;
  planta: PlantaNode | null;
  espacio: EspacioNode | null;
  camas: CamaNode[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onDeleted: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<EspacioTipo>("compartido");
  const [precio, setPrecio] = useState("0");
  const [activo, setActivo] = useState(true);

  const [camasDraft, setCamasDraft] = useState<Record<string, { estado: CamaEstado; activo: boolean }>>(
    {},
  );

  useEffect(() => {
    setNombre(espacio?.data.nombre ?? "");
    setTipo(espacio?.data.tipo ?? "compartido");
    setPrecio(String(espacio?.data.precio ?? 0));
    setActivo(espacio?.data.activo ?? true);
  }, [espacio]);

  useEffect(() => {
    // sincronizar borrador con camas
    setCamasDraft((prev) => {
      const next: Record<string, { estado: CamaEstado; activo: boolean }> = { ...prev };
      const camaIds = new Set(camas.map((c) => c.id));
      for (const id of Object.keys(next)) {
        if (!camaIds.has(id)) delete next[id];
      }
      for (const cama of camas) {
        if (!next[cama.id]) {
          next[cama.id] = {
            estado: cama.data.estado ?? defaultCamaEstado(),
            activo: cama.data.activo !== false,
          };
        }
      }
      return next;
    });
  }, [camas]);

  async function onSave() {
    if (!planta || !espacio) return;
    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "updateEspacioWithCamas",
        payload: {
          plantaId: planta.id,
          espacioId: espacio.id,
          nombre: nombre.trim(),
          tipo,
          precio: asNumber(precio, espacio.data.precio ?? 0),
          activo,
          camas: Object.entries(camasDraft).map(([camaId, d]) => ({
            camaId,
            estado: d.estado,
            activo: d.activo,
          })),
        },
      });
      onDataSynced?.();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error guardando espacio"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!planta || !espacio) return;
    const ok = confirm(
      `¿Eliminar el espacio "${espacio.data.nombre?.trim() || "sin nombre"}"?\n\nEsto eliminará su documento. (Si hay subcolecciones, Firestore no las borra automáticamente.)`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "deleteEspacio",
        payload: { plantaId: planta.id, espacioId: espacio.id },
      });
      onDataSynced?.();
      onDeleted();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error eliminando espacio"));
    } finally {
      setBusy(false);
    }
  }

  if (!planta || !espacio) {
    return (
      <div className="text-sm text-[var(--text-tertiary)]">
        Espacio no encontrado (puede haber sido eliminado).
      </div>
    );
  }

  const showCamasEditor = tipo !== "comun";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {espacio.data.nombre?.trim() ? espacio.data.nombre : "Espacio"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Planta:{" "}
          <span className="font-medium">{planta.data.nombre?.trim() || "Sin nombre"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as EspacioTipo)}>
            {ESPACIO_TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Precio (por noche)">
          <TextInput
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Toggle checked={activo} onChange={setActivo} label={activo ? "Activo" : "Inactivo"} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Camas</div>
            <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Estado editable y visibilidad para reservas (campo <code>activo</code>).
            </div>
          </div>
        </div>

        {showCamasEditor ? (
          <div className="mt-4 space-y-2">
            {camas.length === 0 ? (
              <div className="text-sm text-[var(--text-tertiary)]">No hay camas todavía.</div>
            ) : (
              camas.map((c) => {
                const d = camasDraft[c.id];
                const estado = d?.estado ?? c.data.estado ?? defaultCamaEstado();
                const camaActivo = d?.activo ?? c.data.activo !== false;
                return (
                  <div
                    key={c.id}
                    className="
                      grid grid-cols-1 gap-3 rounded-xl border border-[var(--border-secondary)]
                      bg-[var(--bg-component)] p-3 sm:grid-cols-[1fr_220px_auto]
                    "
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {c.data.nombre || "Cama"}
                      </div>
                    </div>
                    <div>
                      <Select
                        value={estado}
                        onChange={(e) =>
                          setCamasDraft((prev) => ({
                            ...prev,
                            [c.id]: {
                              estado: e.target.value as CamaEstado,
                              activo: camaActivo,
                            },
                          }))
                        }
                      >
                        {CAMA_ESTADOS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center justify-start">
                      <Toggle
                        checked={camaActivo}
                        onChange={(v) =>
                          setCamasDraft((prev) => ({
                            ...prev,
                            [c.id]: { estado, activo: v },
                          }))
                        }
                        label={camaActivo ? "Visible" : "Oculta"}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="mt-4 text-sm text-[var(--text-tertiary)]">
            Este espacio es <span className="font-medium">común</span>, no usa camas.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onSave()} disabled={busy}>
          {busy ? "Guardando..." : "Guardar"}
        </PrimaryButton>
        <DangerButton type="button" onClick={() => void onDelete()} disabled={busy}>
          Eliminar
        </DangerButton>
      </div>
    </div>
  );
}

function CamaPanel({
  hostelId,
  planta,
  espacio,
  cama,
  busy,
  setBusy,
  setError,
  onDeleted,
  onDataSynced,
}: {
  hostelId: string;
  planta: PlantaNode | null;
  espacio: EspacioNode | null;
  cama: CamaNode | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onDeleted: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState<CamaEstado>("libre");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setNombre(cama?.data.nombre ?? "");
    setEstado(cama?.data.estado ?? "libre");
    setVisible(cama?.data.activo !== false);
  }, [cama]);

  async function onSave() {
    if (!planta || !espacio || !cama) return;
    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "updateCama",
        payload: {
          plantaId: planta.id,
          espacioId: espacio.id,
          camaId: cama.id,
          nombre: nombre.trim(),
          estado,
          activo: visible,
        },
      });
      onDataSynced?.();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error guardando cama"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!planta || !espacio || !cama) return;
    const ok = confirm(`¿Eliminar la cama "${cama.data.nombre?.trim() || "sin número"}"?`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await postHostelWrite({
        op: "deleteCama",
        payload: { plantaId: planta.id, espacioId: espacio.id, camaId: cama.id },
      });
      onDataSynced?.();
      onDeleted();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error eliminando cama"));
    } finally {
      setBusy(false);
    }
  }

  if (!planta || !espacio || !cama) {
    return (
      <div className="text-sm text-[var(--text-tertiary)]">
        Cama no encontrada (puede haber sido eliminada).
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {cama.data.nombre?.trim() ? cama.data.nombre : "Cama"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {planta.data.nombre?.trim() || "Planta"} · {espacio.data.nombre?.trim() || "Espacio"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Número">
          <TextInput
            type="text"
            inputMode="numeric"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Field>
        <Field label="Estado">
          <Select value={estado} onChange={(e) => setEstado(e.target.value as CamaEstado)}>
            {CAMA_ESTADOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Toggle
            checked={visible}
            onChange={setVisible}
            label={visible ? "Visible para reservas" : "Oculta para reservas"}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onSave()} disabled={busy}>
          {busy ? "Guardando..." : "Guardar"}
        </PrimaryButton>
        <DangerButton type="button" onClick={() => void onDelete()} disabled={busy}>
          Eliminar
        </DangerButton>
      </div>
    </div>
  );
}
