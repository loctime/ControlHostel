"use client";

import { useEffect, useState } from "react";
import { postHostelWrite } from "@/lib/hostel-config-api";
import type { LandingConfig } from "@/lib/landing-blocks";

type Props = {
  hostelId: string;
  slug: string;
  initialNombre: string;
  initialDescripcion: string;
  landingConfig: LandingConfig | null;
};

export function EditBar({
  hostelId,
  slug,
  initialNombre,
  initialDescripcion,
  landingConfig,
}: Props) {
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(initialNombre);
  const [descripcion, setDescripcion] = useState(initialDescripcion);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si el usuario logueado es dueño de este hostel
    fetch("/api/hostels/snapshot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.hostelId === hostelId || data?.hostel) {
          // El endpoint /api/hostels/snapshot solo responde con datos si el usuario
          // tiene sesión y su hostelId coincide con el del documento.
          // Comparamos el hostelId que nos pasó el server con el que devuelve la API.
          setIsOwner(true);
        }
      })
      .catch(() => null);
  }, [hostelId]);

  if (!isOwner) return null;

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await postHostelWrite({
        op: "updateHostel",
        payload: {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          slug,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(28, 32, 56, 0.97)",
        borderBottom: "1px solid rgba(124,131,255,0.3)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        <span className="shrink-0 rounded-lg bg-[#7c83ff]/20 px-2 py-1 text-xs font-semibold text-[#7c83ff]">
          Modo edición
        </span>

        {open ? (
          <>
            <input
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-[#7c83ff]"
              placeholder="Nombre del hostel"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={busy}
            />
            <input
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-[#7c83ff]"
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={busy}
            />
            <button
              onClick={() => void onSave()}
              disabled={busy}
              className="shrink-0 rounded-xl bg-[#7c83ff] px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 text-xs text-gray-400 hover:text-white"
            >
              Cerrar
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-sm text-gray-300 hover:text-white"
          >
            ✏️ Editar landing
          </button>
        )}

        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
