"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción podrías enviar el error a un servicio de monitoreo aquí
    void error;
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg-page, #09090b)",
        color: "var(--text-primary, #fafafa)",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          Algo salió mal
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary, #a1a1aa)",
          }}
        >
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid var(--border-secondary, #27272a)",
              background: "var(--bg-button, #18181b)",
              color: "var(--text-primary, #fafafa)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              background: "var(--bg-accent, #3b82f6)",
              color: "var(--text-button, #fff)",
              fontSize: "0.875rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
