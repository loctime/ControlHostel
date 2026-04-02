"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, loading } = useAuth();
  const { mode, toggleMode } = useTheme();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const linkBase =
    "flex items-center justify-start rounded-lg px-3 py-2 text-sm transition-colors border border-transparent";
  const linkActive =
    "bg-[var(--bg-accent)] text-[var(--text-button)] border-[var(--border-primary)] hover:opacity-90";
  const linkInactive =
    "text-[var(--text-secondary)] hover:bg-[var(--bg-list)] hover:text-[var(--text-primary)]";

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <aside
        className="
          fixed left-0 top-0 h-screen w-[200px]
          border-r border-[var(--border-secondary)] bg-[var(--bg-sidebar)] shadow-sm
          px-4 py-5
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              bg-[var(--bg-button)] text-sm font-semibold text-[var(--text-button)]
            "
          >
            CH
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              ControlHostel
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">Gestión</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              PRINCIPAL
            </div>
            <nav className="space-y-1">
              <Link
                href="/"
                className={cx(
                  linkBase,
                  pathname === "/" ? linkActive : linkInactive,
                )}
              >
                Panel
              </Link>
              <Link
                href="/calendario"
                className={cx(
                  linkBase,
                  pathname === "/calendario" ? linkActive : linkInactive,
                )}
              >
                Calendario
              </Link>
              <Link
                href="/reservas"
                className={cx(
                  linkBase,
                  pathname === "/reservas" ? linkActive : linkInactive,
                )}
              >
                Reservas
              </Link>
            </nav>
          </section>

          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              GESTIÓN
            </div>
            <nav className="space-y-1">
              <Link
                href="/habitaciones"
                className={cx(
                  linkBase,
                  pathname === "/habitaciones" ? linkActive : linkInactive,
                )}
              >
                Habitaciones
              </Link>
              <Link
                href="/configuracion"
                className={cx(
                  linkBase,
                  pathname === "/configuracion" ? linkActive : linkInactive,
                )}
              >
                Configuración
              </Link>
            </nav>
          </section>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <button
            type="button"
            onClick={() => toggleMode()}
            aria-label="Cambiar tema"
            className="
              w-full rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-button)]
              px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition
              hover:bg-[var(--bg-list)]
              disabled:opacity-50
            "
          >
            <div className="flex items-center justify-center">
              {mode === "dark" ? (
                // Ícono sol (modo claro como objetivo)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M4.93 4.93l1.41 1.41" />
                  <path d="M17.66 17.66l1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="M4.93 19.07l1.41-1.41" />
                  <path d="M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                // Ícono luna (modo oscuro como objetivo)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                </svg>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loading}
            className="
              w-full rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-button)] px-3 py-2.5 text-sm font-medium
              text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-list)] disabled:opacity-50
            "
          >
            {loading ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <main className="ml-[200px] min-h-screen p-6">{children}</main>
    </div>
  );
}

