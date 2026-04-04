import type { ReactNode } from "react";

export type PageSkeletonVariant =
  | "panel"
  | "reservas"
  | "habitaciones"
  | "calendario"
  | "configuracion";

export type PageSkeletonProps = {
  variant?: PageSkeletonVariant;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const skeletonBase =
  "animate-pulse rounded-xl bg-[var(--bg-component)] border border-[var(--border-secondary)]/40";

const skeletonMuted = "animate-pulse rounded-xl bg-[var(--border-secondary)]";

function Shell({ spaceY, children }: { spaceY: "5" | "6"; children: ReactNode }) {
  return (
    <div
      className={cx(
        "opacity-60 text-[var(--text-primary)]",
        spaceY === "6" ? "space-y-6" : "space-y-5",
      )}
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      {children}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <Shell spaceY="6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className={cx(skeletonBase, "h-8 w-40")} />
          <div className={cx(skeletonMuted, "h-4 w-56")} />
        </div>
        <div className={cx(skeletonBase, "h-11 w-40 shrink-0")} />
      </div>

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
          backdrop-blur
        "
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="
                rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-5 shadow-sm
              "
            >
              <div className={cx(skeletonMuted, "h-3 w-24")} />
              <div className={cx(skeletonBase, "mt-3 h-9 w-16")} />
              <div className={cx(skeletonMuted, "mt-2 h-3 w-32")} />
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
        <div className={cx(skeletonBase, "h-6 w-48")} />
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)]">
          <div className="divide-y divide-[var(--border-secondary)]">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className={cx(skeletonBase, "h-10 w-10 shrink-0 rounded-full")} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={cx(skeletonBase, "h-4 w-3/5 max-w-[14rem]")} />
                  <div className={cx(skeletonMuted, "h-3 w-2/5 max-w-[10rem]")} />
                </div>
                <div className={cx(skeletonMuted, "hidden h-8 w-20 shrink-0 sm:block")} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function ReservasSkeleton() {
  return (
    <Shell spaceY="5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className={cx(skeletonBase, "h-8 w-36")} />
          <div className={cx(skeletonMuted, "h-4 w-48")} />
        </div>
        <div className={cx(skeletonBase, "h-11 w-40 shrink-0")} />
      </div>

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
        "
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_0.9fr_0.9fr]">
          <div className={cx(skeletonBase, "h-10 w-full")} />
          <div className={cx(skeletonBase, "h-10 w-full")} />
          <div className={cx(skeletonBase, "h-10 w-full")} />
          <div className={cx(skeletonBase, "h-10 w-full")} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={cx(skeletonMuted, "h-9 w-24")} />
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] shadow-sm">
        <div className="divide-y divide-[var(--border-secondary)]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className={cx(skeletonBase, "h-10 w-10 shrink-0 rounded-full")} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={cx(skeletonBase, "h-4 w-2/3 max-w-xs")} />
                <div className={cx(skeletonMuted, "h-3 w-1/2 max-w-[12rem]")} />
              </div>
              <div className={cx(skeletonMuted, "h-7 w-20 shrink-0 rounded-full")} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function HabitacionesSkeleton() {
  return (
    <Shell spaceY="5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className={cx(skeletonBase, "h-8 w-44")} />
          <div className={cx(skeletonMuted, "h-4 w-64")} />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={cx(skeletonBase, "h-9 w-28")} />
          ))}
        </div>
      </div>

      <section className="space-y-4">
        {Array.from({ length: 2 }, (_, pi) => (
          <div
            key={pi}
            className="
              rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className={cx(skeletonBase, "h-5 w-32")} />
                <div className={cx(skeletonMuted, "h-3 w-24")} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 2 }, (_, ei) => (
                <div
                  key={ei}
                  className="
                    rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className={cx(skeletonBase, "h-4 w-28")} />
                      <div className={cx(skeletonMuted, "h-3 w-20")} />
                    </div>
                    <div className={cx(skeletonMuted, "h-6 w-16 rounded-full")} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 6 }, (_, ci) => (
                      <div
                        key={ci}
                        className={cx(
                          skeletonBase,
                          "h-10 w-10 shrink-0 rounded-full border-2 border-[var(--border-secondary)]",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </Shell>
  );
}

function CalendarioSkeleton() {
  const weekdays = 7;
  const weeks = 5;
  return (
    <Shell spaceY="5">
      <div>
        <div className={cx(skeletonBase, "h-8 w-40")} />
        <div className={cx(skeletonMuted, "mt-2 h-4 w-52")} />
      </div>

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
        "
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cx(skeletonBase, "h-9 w-9 shrink-0")} />
            <div className={cx(skeletonBase, "h-9 w-9 shrink-0")} />
            <div className={cx(skeletonMuted, "ml-2 h-4 w-28")} />
          </div>
          <div className="flex gap-2">
            <div className={cx(skeletonBase, "h-9 w-14")} />
            <div className={cx(skeletonBase, "h-9 w-20")} />
          </div>
        </div>
        <div
          className="grid gap-2 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-3"
          style={{ gridTemplateColumns: `repeat(${weekdays}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: weekdays }, (_, h) => (
            <div key={h} className={cx(skeletonMuted, "mx-auto h-3 w-8")} />
          ))}
          {Array.from({ length: weekdays * weeks }, (_, c) => (
            <div
              key={c}
              className={cx(
                skeletonBase,
                "aspect-square min-h-[2.5rem] w-full rounded-lg border border-[var(--border-secondary)]/50",
              )}
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function ConfiguracionSkeleton() {
  return (
    <div
      className="space-y-4 opacity-60 text-[var(--text-primary)]"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <div className={cx(skeletonBase, "h-8 w-48")} />

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
          <div className={cx(skeletonBase, "h-16 w-full")} />
          <div className="mt-4 space-y-2">
            <div className={cx(skeletonMuted, "h-3 w-20")} />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={cx(skeletonBase, "h-11 w-full")} />
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-page)] p-4">
          <div className={cx(skeletonBase, "h-7 w-2/3 max-w-sm")} />
          <div className={cx(skeletonMuted, "h-4 w-full max-w-lg")} />
          <div className={cx(skeletonMuted, "h-4 w-5/6 max-w-md")} />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className={cx(skeletonBase, "h-10 w-full")} />
            <div className={cx(skeletonBase, "h-10 w-full")} />
          </div>
          <div className={cx(skeletonBase, "h-32 w-full")} />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "panel" }: PageSkeletonProps) {
  switch (variant) {
    case "panel":
      return <PanelSkeleton />;
    case "reservas":
      return <ReservasSkeleton />;
    case "habitaciones":
      return <HabitacionesSkeleton />;
    case "calendario":
      return <CalendarioSkeleton />;
    case "configuracion":
      return <ConfiguracionSkeleton />;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
