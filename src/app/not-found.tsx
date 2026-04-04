"use client";

import Link from "next/link";

export default function NotFound() {
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
        <div
          style={{
            fontSize: "4rem",
            fontWeight: 700,
            color: "var(--text-tertiary, #52525b)",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          Página no encontrada
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary, #a1a1aa)",
          }}
        >
          La página que buscás no existe o fue movida.
        </p>
        <Link
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
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
