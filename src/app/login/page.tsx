"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const {
    signInWithEmail,
    signInWithGoogle,
    loading: authLoading,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle();
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar con Google");
    } finally {
      setPending(false);
    }
  }

  async function handleEmailSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credenciales inválidas");
    } finally {
      setPending(false);
    }
  }

  const busy = pending || authLoading;

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            ControlHostel
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Iniciá sesión para continuar
          </p>
        </div>

        {error ? (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900">
              o con email
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {busy ? "…" : "Entrar"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm">
          <a
            href="/login/forgot-password"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ¿Olvidaste tu contraseña?
          </a>
          <a
            href="/register"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ¿No tenés cuenta? <span className="font-medium">Registrate</span>
          </a>
        </div>
      </div>
    </main>
  );
}
