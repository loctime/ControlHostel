import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

/** Evita doble init en HMR de Next.js (misma pestaña). */
const firestoreSingleton = globalThis as unknown as { __controlhostelDb?: Firestore };

function getOrCreateFirestore(app: FirebaseApp): Firestore {
  if (firestoreSingleton.__controlhostelDb) {
    return firestoreSingleton.__controlhostelDb;
  }
  try {
    firestoreSingleton.__controlhostelDb = initializeFirestore(app, {
      // WebChannel suele romperse con bloqueadores (p. ej. ERR_BLOCKED_BY_CLIENT) y dispara bugs del SDK (ca9).
      experimentalForceLongPolling: true,
    });
  } catch {
    firestoreSingleton.__controlhostelDb = getFirestore(app);
  }
  return firestoreSingleton.__controlhostelDb;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

// Firebase client SDK solo puede inicializarse en el browser.
// Durante SSR/build la inicialización se difiere para evitar errores con env vars ausentes.
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function ensureInitialized() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK solo puede usarse en el browser");
  }
  if (!_app) {
    _app = getFirebaseApp();
    _auth = getAuth(_app);
    _db = getOrCreateFirestore(_app);
  }
  return { app: _app, auth: _auth!, db: _db! };
}

// Proxies que se inicializan de forma lazy
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return ensureInitialized().app[prop as keyof FirebaseApp];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    return ensureInitialized().auth[prop as keyof Auth];
  },
});

/**
 * Retorna la instancia real de Firestore (solo browser).
 * Usar esta función en vez de un Proxy evita que falle el check
 * `instanceof Firestore` que hace internamente el SDK de Firebase.
 */
export function getDb(): Firestore {
  return ensureInitialized().db;
}
