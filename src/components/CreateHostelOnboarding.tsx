"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHostel } from "@/context/HostelContext";

const LOG = "[CreateHostel]";

function logError(step: string, e: unknown) {
  console.error(`${LOG} falló: ${step}`, e);
  if (e && typeof e === "object") {
    const o = e as { code?: string; message?: string; customData?: unknown };
    if (o.code != null) console.error(`${LOG} código Firestore`, o.code);
    if (o.customData != null) console.error(`${LOG} customData`, o.customData);
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

export type CreateHostelOnboardingProps = {
  onComplete?: () => void;
  heading?: string;
  description?: string;
  className?: string;
  /** false: layout compacto para la ruta /setup */
  centeredInViewport?: boolean;
};

export function CreateHostelOnboarding({
  onComplete,
  heading = "Bienvenido, creá tu hostel para empezar",
  description = "Completá el nombre y la dirección para crear tu hostel.",
  className,
  centeredInViewport = true,
}: CreateHostelOnboardingProps) {
  const { user } = useAuth();
  const { refreshUsuario } = useHostel();
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (!user) {
      console.warn(`${LOG} onConfirm sin usuario`);
      return;
    }
    if (!nombre.trim()) {
      setError("Ingresá el nombre del hostel.");
      return;
    }

    setBusy(true);
    setError(null);
    console.log(`${LOG} inicio`, { uid: user.uid });
    try {
      console.log(`${LOG} POST /api/hostels/create (Admin SDK, sin depender de reglas cliente)`);
      const res = await fetch("/api/hostels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          direccion: direccion.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        hostelId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Error del servidor (${res.status})`);
      }
      console.log(`${LOG} OK`, { hostelId: data.hostelId });

      await refreshUsuario();
      if (onComplete) {
        onComplete();
      } else {
        // Recargar para ver la app ya con hostelId
        window.location.href = "/";
      }
    } catch (e: unknown) {
      logError("crear hostel", e);
      setError(e instanceof Error ? e.message : "Error creando el hostel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cx(
        centeredInViewport
          ? "flex min-h-[min(560px,calc(100vh-8rem))] items-center justify-center p-4"
          : "mx-auto w-full max-w-xl p-4 pt-8",
        className,
      )}
    >
      <div
        className="
          w-full max-w-xl rounded-2xl border border-[var(--border-secondary)]
          bg-[var(--bg-component)] p-6 shadow-sm
        "
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {heading}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{description}</p>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3 text-sm"
            style={{ borderColor: "rgba(255, 99, 99, 0.45)" }}
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="block">
            <div className="text-xs font-medium text-[var(--text-secondary)]">Nombre del hostel</div>
            <div className="mt-1">
              <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          </label>
          <label className="block">
            <div className="text-xs font-medium text-[var(--text-secondary)]">Dirección</div>
            <div className="mt-1">
              <TextInput value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <PrimaryButton type="button" disabled={busy || !user} onClick={() => void onConfirm()}>
            {busy ? "Creando..." : "Confirmar"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
