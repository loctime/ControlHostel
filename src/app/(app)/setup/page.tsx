"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useHostel } from "@/context/HostelContext";
import type { Hostel } from "@/lib/db";
import { hostelsCollection } from "@/lib/db";
import type { Usuario } from "@/lib/usuario";
import { usuarioRef } from "@/lib/usuario";

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

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hostelId, loading: hostelLoading } = useHostel();

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || hostelLoading) return;
    if (!user) return;
    if (hostelId) {
      router.push("/");
      router.refresh();
    }
  }, [authLoading, hostelId, hostelLoading, router, user]);

  async function onConfirm() {
    if (!user) return;
    if (!nombre.trim()) {
      setError("Ingresá el nombre del hostel.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const hostelDoc = await addDoc(hostelsCollection(), {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
      } satisfies Hostel);

      await setDoc(usuarioRef(user.uid), { hostelId: hostelDoc.id } satisfies Usuario);

      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando el hostel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-page)" }}>
      <div
        className="
          mx-auto max-w-xl rounded-2xl border border-[var(--border-secondary)]
          bg-[var(--bg-component)] p-6 shadow-sm
        "
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Setup inicial
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Creá tu hostel para empezar a usar ControlHostel.
        </p>

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

