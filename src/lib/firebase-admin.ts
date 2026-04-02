import * as admin from "firebase-admin";

function getServiceAccountJson(): Record<string, unknown> {
  if (process.env.NODE_ENV === "development") {
    // En desarrollo usamos el archivo JSON en la raíz del proyecto.
    // Ruta relativa desde `src/lib/` => `../../serviceAccountHostel.json`
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./../../serviceAccountHostel.json") as Record<
      string,
      unknown
    >;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error(
      "Falta FIREBASE_SERVICE_ACCOUNT_JSON (JSON del service account en una sola línea).",
    );
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }
  const credential = admin.credential.cert(
    getServiceAccountJson() as admin.ServiceAccount,
  );
  return admin.initializeApp({ credential });
}
