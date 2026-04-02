import { collection, doc, type CollectionReference, type DocumentReference } from "firebase/firestore";
import { db } from "./firebase";

/** usuarios/{uid} */
export type Usuario = {
  hostelId: string;
};

export function usuariosCollection(): CollectionReference<Usuario, Usuario> {
  return collection(db, "usuarios") as CollectionReference<Usuario, Usuario>;
}

export function usuarioRef(uid: string): DocumentReference<Usuario, Usuario> {
  return doc(db, "usuarios", uid) as DocumentReference<Usuario, Usuario>;
}

