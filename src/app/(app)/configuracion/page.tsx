"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import type {
  Cama,
  CamaEstado,
  Espacio,
  EspacioTipo,
  Hostel,
  Planta,
} from "@/lib/db";
import {
  camaRef,
  camasCollection,
  espacioRef,
  espaciosCollection,
  hostelRef,
  plantaRef,
  plantasCollection,
} from "@/lib/db";
import { useHostelSnapshot } from "@/lib/hostel-snapshot-client";

type Id = string;

type PlantaNode = { id: Id; data: Planta };
type EspacioNode = { id: Id; data: Espacio };
type CamaNode = { id: Id; data: Cama & { activo?: boolean } };

type Selection =
  | { kind: "hostel" }
  | { kind: "planta"; plantaId: Id }
  | { kind: "espacio"; plantaId: Id; espacioId: Id }
  | { kind: "cama"; plantaId: Id; espacioId: Id; camaId: Id }
  | { kind: "add_planta" }
  | { kind: "add_espacio"; plantaId: Id }
  | { kind: "add_cama"; plantaId: Id; espacioId: Id };

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

  const syncData = () => void reload();

  const selectedPlantaId =
    selection.kind === "planta"
      ? selection.plantaId
      : selection.kind === "espacio"
        ? selection.plantaId
        : selection.kind === "cama"
          ? selection.plantaId
          : selection.kind === "add_espacio"
            ? selection.plantaId
            : selection.kind === "add_cama"
              ? selection.plantaId
              : null;

  const selectedEspacioId =
    selection.kind === "espacio"
      ? selection.espacioId
      : selection.kind === "cama"
        ? selection.espacioId
        : selection.kind === "add_cama"
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

  const treeHostelTitle = hostel?.nombre?.trim() ? hostel.nombre : "Hostel";
  const treeHostelSubtitle = hostel?.direccion?.trim() ? hostel.direccion : "Sin dirección";

  if (loading || !hostelId) return null;

  return (
    <div className="text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      <div
        className="
          grid gap-6
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
        "
        style={{ gridTemplateColumns: "260px 1fr" }}
      >
        <aside
          className="
            rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-sidebar)] p-3
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

            <div className="space-y-1">
              {plantas.map((planta) => {
                const isExpanded = !!expandedPlantas[planta.id];
                const isSelected = selection.kind === "planta" && selection.plantaId === planta.id;
                const espacios = espaciosByPlanta[planta.id] ?? [];

                return (
                  <div key={planta.id} className="rounded-xl">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlanta(planta.id)}
                        className="
                          inline-flex h-7 w-7 items-center justify-center rounded-lg
                          border border-transparent text-[var(--text-secondary)] transition
                          hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                        "
                        aria-label={isExpanded ? "Colapsar planta" : "Expandir planta"}
                      >
                        <span className="text-base">{isExpanded ? "▾" : "▸"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: "planta", plantaId: planta.id })}
                        className={cx(
                          "flex-1 rounded-xl border px-3 py-2 text-left transition",
                          isSelected
                            ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                            : "border-transparent hover:bg-[var(--bg-list)]",
                        )}
                      >
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {planta.data.nombre || "Planta"}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                          Orden: {planta.data.orden}
                        </div>
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="ml-9 mt-1 space-y-1">
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
                            <div key={espacio.id} className="rounded-xl">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleEspacio(planta.id, espacio.id)}
                                  className="
                                    inline-flex h-7 w-7 items-center justify-center rounded-lg
                                    border border-transparent text-[var(--text-secondary)] transition
                                    hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                                  "
                                  aria-label={isExpandedEspacio ? "Colapsar espacio" : "Expandir espacio"}
                                >
                                  <span className="text-base">{isExpandedEspacio ? "▾" : "▸"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelection({
                                      kind: "espacio",
                                      plantaId: planta.id,
                                      espacioId: espacio.id,
                                    })
                                  }
                                  className={cx(
                                    "flex-1 rounded-xl border px-3 py-2 text-left transition",
                                    isEspacioSelected
                                      ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                                      : "border-transparent hover:bg-[var(--bg-list)]",
                                  )}
                                >
                                  <div className="text-sm font-medium text-[var(--text-primary)]">
                                    {espacio.data.nombre || "Espacio"}
                                  </div>
                                  <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                    {espacio.data.tipo} · ${espacio.data.precio ?? 0}
                                  </div>
                                </button>
                              </div>

                              {isExpandedEspacio ? (
                                <div className="ml-9 mt-1 space-y-1">
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
                                            "w-full rounded-xl border px-3 py-2 text-left transition",
                                            isCamaSelected
                                              ? "border-[var(--border-primary)] bg-[var(--bg-list)]"
                                              : "border-transparent hover:bg-[var(--bg-list)]",
                                          )}
                                        >
                                          <div className="text-sm text-[var(--text-primary)]">
                                            {cama.data.nombre || "Cama"}
                                          </div>
                                          <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                            {cama.data.estado}
                                            {" · "}
                                            {cama.data.activo === false
                                              ? "No visible"
                                              : "Visible"}
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                                      Espacio común (sin camas)
                                    </div>
                                  )}

                                  {showCamasInTree ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelection({
                                          kind: "add_cama",
                                          plantaId: planta.id,
                                          espacioId: espacio.id,
                                        })
                                      }
                                      className="
                                        w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                                        bg-transparent px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                                        transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
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

                        <button
                          type="button"
                          onClick={() => setSelection({ kind: "add_espacio", plantaId: planta.id })}
                          className="
                            w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                            bg-transparent px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                            transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                          "
                        >
                          + Agregar espacio
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setSelection({ kind: "add_planta" })}
                className="
                  mt-2 w-full rounded-xl border border-dashed border-[var(--border-secondary)]
                  bg-transparent px-3 py-2 text-left text-sm text-[var(--text-secondary)]
                  transition hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]
                "
              >
                + Agregar planta
              </button>
            </div>
          </div>
        </aside>

        <section
          className="
            rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-5 shadow-sm
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Configuración
              </h1>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Hostel: <span className="font-medium">{hostelId}</span>
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

            {selection.kind === "add_planta" ? (
              <AddPlantaPanel
                hostelId={hostelId}
                existingPlantas={plantas}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onCreated={() => setSelection({ kind: "hostel" })}
                onDataSynced={syncData}
              />
            ) : null}

            {selection.kind === "add_espacio" ? (
              <AddEspacioPanel
                hostelId={hostelId}
                planta={selectedPlanta}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onCreated={() => setSelection({ kind: "hostel" })}
                onDataSynced={syncData}
              />
            ) : null}

            {selection.kind === "add_cama" ? (
              <AddCamaPanel
                hostelId={hostelId}
                planta={selectedPlanta}
                espacio={selectedEspacio}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onCreated={() => setSelection({ kind: "hostel" })}
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

  useEffect(() => {
    setNombre(hostel?.nombre ?? "");
    setDireccion(hostel?.direccion ?? "");
  }, [hostel]);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await updateDoc(hostelRef(hostelId), {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
      } satisfies Hostel);
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

  useEffect(() => {
    setNombre(planta?.data.nombre ?? "");
    setOrden(String(planta?.data.orden ?? 0));
  }, [planta]);

  async function onSave() {
    if (!planta) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(plantaRef(hostelId, planta.id), {
        nombre: nombre.trim(),
        orden: asNumber(orden, planta.data.orden ?? 0),
      } satisfies Planta);
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
      `¿Eliminar la planta "${planta.data.nombre || planta.id}"?\n\nEsto eliminará su documento. (Si hay subcolecciones, Firestore no las borra automáticamente.)`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await deleteDoc(plantaRef(hostelId, planta.id));
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Planta</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">ID: {planta.id}</p>
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
      await updateDoc(espacioRef(hostelId, planta.id, espacio.id), {
        nombre: nombre.trim(),
        tipo,
        precio: asNumber(precio, espacio.data.precio ?? 0),
        activo,
      } satisfies Espacio);

      // guardar cambios de camas inline (estado + activo)
      const updates = Object.entries(camasDraft);
      for (const [camaId, d] of updates) {
        await updateDoc(camaRef(hostelId, planta.id, espacio.id, camaId), {
          estado: d.estado,
          activo: d.activo,
        } as Partial<Cama> & { activo: boolean });
      }
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
      `¿Eliminar el espacio "${espacio.data.nombre || espacio.id}"?\n\nEsto eliminará su documento. (Si hay subcolecciones, Firestore no las borra automáticamente.)`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await deleteDoc(espacioRef(hostelId, planta.id, espacio.id));
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Espacio</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Planta: <span className="font-medium">{planta.data.nombre || planta.id}</span> · ID:{" "}
          {espacio.id}
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
                      <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">ID: {c.id}</div>
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
      await updateDoc(camaRef(hostelId, planta.id, espacio.id, cama.id), {
        nombre: nombre.trim(),
        estado,
        activo: visible,
      } as Partial<Cama> & { activo: boolean });
      onDataSynced?.();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error guardando cama"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!planta || !espacio || !cama) return;
    const ok = confirm(`¿Eliminar la cama "${cama.data.nombre || cama.id}"?`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await deleteDoc(camaRef(hostelId, planta.id, espacio.id, cama.id));
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cama</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {planta.data.nombre || planta.id} · {espacio.data.nombre || espacio.id} · ID: {cama.id}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
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

function AddPlantaPanel({
  hostelId,
  existingPlantas,
  busy,
  setBusy,
  setError,
  onCreated,
  onDataSynced,
}: {
  hostelId: string;
  existingPlantas: PlantaNode[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onCreated: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("");

  useEffect(() => {
    const maxOrden = existingPlantas.reduce((max, p) => Math.max(max, p.data.orden ?? 0), 0);
    setOrden(String(maxOrden + 1));
  }, [existingPlantas]);

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      await addDoc(plantasCollection(hostelId), {
        nombre: nombre.trim() || "Nueva planta",
        orden: asNumber(orden, 0),
      } satisfies Planta);
      onDataSynced?.();
      onCreated();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error creando planta"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agregar planta</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">Formulario inline simple.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Orden">
          <TextInput value={orden} onChange={(e) => setOrden(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onCreate()} disabled={busy}>
          {busy ? "Creando..." : "Confirmar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function AddEspacioPanel({
  hostelId,
  planta,
  busy,
  setBusy,
  setError,
  onCreated,
  onDataSynced,
}: {
  hostelId: string;
  planta: PlantaNode | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onCreated: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<EspacioTipo>("compartido");
  const [precio, setPrecio] = useState("0");
  const [activo, setActivo] = useState(true);

  async function onCreate() {
    if (!planta) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(espaciosCollection(hostelId, planta.id), {
        nombre: nombre.trim() || "Nuevo espacio",
        tipo,
        precio: asNumber(precio, 0),
        activo,
      } satisfies Espacio);
      onDataSynced?.();
      onCreated();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error creando espacio"));
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agregar espacio</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Planta: <span className="font-medium">{planta.data.nombre || planta.id}</span>
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

      <div className="flex items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onCreate()} disabled={busy}>
          {busy ? "Creando..." : "Confirmar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function AddCamaPanel({
  hostelId,
  planta,
  espacio,
  busy,
  setBusy,
  setError,
  onCreated,
  onDataSynced,
}: {
  hostelId: string;
  planta: PlantaNode | null;
  espacio: EspacioNode | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onCreated: () => void;
  onDataSynced?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState<CamaEstado>("libre");
  const [visible, setVisible] = useState(true);

  async function onCreate() {
    if (!planta || !espacio) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(camasCollection(hostelId, planta.id, espacio.id), {
        nombre: nombre.trim() || "Nueva cama",
        estado,
        activo: visible,
      } as Cama & { activo: boolean });
      onDataSynced?.();
      onCreated();
    } catch (e: unknown) {
      setError(errorMessage(e, "Error creando cama"));
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

  if (espacio.data.tipo === "comun") {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agregar cama</h2>
        <div className="text-sm text-[var(--text-tertiary)]">
          Este espacio es <span className="font-medium">común</span> y no admite camas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agregar cama</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {planta.data.nombre || planta.id} · {espacio.data.nombre || espacio.id}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
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

      <div className="flex items-center gap-3">
        <PrimaryButton type="button" onClick={() => void onCreate()} disabled={busy}>
          {busy ? "Creando..." : "Confirmar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

