export default function PanelPage() {
  const today = new Date();
  const fecha = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(today);

  const metrics = [
    { label: "Ocupación hoy", value: "74%", hint: "Habitaciones ocupadas" },
    { label: "Llegadas hoy", value: "12", hint: "Check-ins" },
    { label: "Salidas hoy", value: "9", hint: "Check-outs" },
    { label: "Disponibles", value: "18", hint: "Camas libres" },
  ] as const;

  return (
    <div
      className="space-y-6 text-[var(--text-primary)]"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Panel
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{fecha}</p>
        </div>

        <button
          type="button"
          className="
            inline-flex items-center justify-center rounded-xl bg-[var(--bg-accent)] px-4 py-2.5
            text-sm font-medium text-[var(--text-button)] shadow-sm transition hover:opacity-90
          "
        >
          + Nueva reserva
        </button>
      </div>

      <section
        className="
          rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-4 shadow-sm
          backdrop-blur
        "
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="
                rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-component)] p-5
                text-[var(--text-primary)]
                shadow-sm
              "
            >
              <div className="text-xs font-medium text-[var(--text-secondary)]">{m.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {m.value}
              </div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]" style={{ opacity: 0.8 }}>
                {m.hint}
              </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Movimientos de hoy
          </h2>
        </div>

        <ul className="mt-4 space-y-2" />
      </section>
    </div>
  );
}

