import { collection, doc, type CollectionReference, type DocumentReference } from "firebase/firestore";
import { getDb } from "./firebase";

/** usuarios/{uid} — `hostelId: null` = sin hostel asignado (setup). En Firestore usá null, no "". */
export type Usuario = {
  hostelId: string | null;
};

export function usuariosCollection(): CollectionReference<Usuario, Usuario> {
  return collection(getDb(), "usuarios") as CollectionReference<Usuario, Usuario>;
}

export function usuarioRef(uid: string): DocumentReference<Usuario, Usuario> {
  return doc(getDb(), "usuarios", uid) as DocumentReference<Usuario, Usuario>;
}

