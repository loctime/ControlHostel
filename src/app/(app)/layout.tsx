"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, loading } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const linkBase =
    "flex items-center justify-start rounded-lg px-3 py-2 text-sm transition-colors";
  const linkActive =
    "bg-zinc-900 text-zinc-50 hover:bg-zinc-800";
  const linkInactive =
    "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside
        className="
          fixed left-0 top-0 h-screen w-[200px]
          border-r border-zinc-200 bg-zinc-100 shadow-sm
          px-4 py-5
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              bg-zinc-900 text-sm font-semibold text-zinc-50
            "
          >
            CH
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-900">
              ControlHostel
            </div>
            <div className="text-xs text-zinc-500">
              Gestión
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loading}
            className="
              w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium
              text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50
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

