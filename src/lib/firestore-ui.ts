/** Log en consola para listeners de Firestore (los errores no aparecen solos). */
export function logFirestoreListenError(scope: string, detail: string, err: unknown) {
  console.error(`[Firestore:${scope}] ${detail}`, err);
}

export function userFacingFirestoreError(err: unknown, shortLabel: string): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  if (code === "permission-denied") {
    return `${shortLabel}: permisos denegados. Las reglas activas en Firebase deben permitir leer tu hostel (archivo firestore.rules del repo). Publicalas con: firebase deploy --only firestore:rules`;
  }
  if (err instanceof Error && err.message.trim()) {
    return `${shortLabel}: ${err.message}`;
  }
  return shortLabel;
}
