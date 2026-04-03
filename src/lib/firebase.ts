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

export const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getOrCreateFirestore(app);
