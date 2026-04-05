import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { getDb } from "./firebase";

/** hostels/{hostelId} */
export type Hostel = {
  nombre: string;
  direccion: string;
};

/** hostels/{hostelId}/plantas/{plantaId} */
export type Planta = {
  nombre: string;
  orden: number;
  color?: string;
};

export type EspacioTipo = "privada" | "compartido" | "comun";

/** hostels/{hostelId}/plantas/{plantaId}/espacios/{espacioId} */
export type Espacio = {
  nombre: string;
  tipo: EspacioTipo;
  precio: number;
  activo: boolean;
};

export type CamaEstado = "libre" | "ocupada" | "bloqueada" | "fuera_de_servicio";

/** …/espacios/{espacioId}/camas/{camaId} */
export type Cama = {
  nombre: string;
  estado: CamaEstado;
};

export type ReservaEstado =
  | "pendiente"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada";

export type Huesped = {
  nombre: string;
  telefono: string;
  email: string;
  dni: string;
};

/** hostels/{hostelId}/reservas/{reservaId} */
export type Reserva = {
  espacioId: string;
  camaId: string;
  plantaId: string;
  checkin: Timestamp;
  checkout: Timestamp;
  estado: ReservaEstado;
  huesped: Huesped;
  notas: string;
};

/** hostels/{hostelId}/bloqueos/{bloqueoId} */
export type Bloqueo = {
  plantaId?: string;
  espacioId: string;
  camaId: string;
  desde: Timestamp;
  hasta: Timestamp;
  motivo: string;
};

export function hostelsCollection(): CollectionReference<Hostel, Hostel> {
  return collection(getDb(), "hostels") as CollectionReference<Hostel, Hostel>;
}

export function hostelRef(hostelId: string): DocumentReference<Hostel, Hostel> {
  return doc(getDb(), "hostels", hostelId) as DocumentReference<Hostel, Hostel>;
}

export function plantasCollection(
  hostelId: string,
): CollectionReference<Planta, Planta> {
  return collection(
    db,
    "hostels",
    hostelId,
    "plantas",
  ) as CollectionReference<Planta, Planta>;
}

export function plantaRef(
  hostelId: string,
  plantaId: string,
): DocumentReference<Planta, Planta> {
  return doc(
    db,
    "hostels",
    hostelId,
    "plantas",
    plantaId,
  ) as DocumentReference<Planta, Planta>;
}

export function espaciosCollection(
  hostelId: string,
  plantaId: string,
): CollectionReference<Espacio, Espacio> {
  return collection(
    db,
    "hostels",
    hostelId,
    "plantas",
    plantaId,
    "espacios",
  ) as CollectionReference<Espacio, Espacio>;
}

export function espacioRef(
  hostelId: string,
  plantaId: string,
  espacioId: string,
): DocumentReference<Espacio, Espacio> {
  return doc(
    db,
    "hostels",
    hostelId,
    "plantas",
    plantaId,
    "espacios",
    espacioId,
  ) as DocumentReference<Espacio, Espacio>;
}

export function camasCollection(
  hostelId: string,
  plantaId: string,
  espacioId: string,
): CollectionReference<Cama, Cama> {
  return collection(
    db,
    "hostels",
    hostelId,
    "plantas",
    plantaId,
    "espacios",
    espacioId,
    "camas",
  ) as CollectionReference<Cama, Cama>;
}

export function camaRef(
  hostelId: string,
  plantaId: string,
  espacioId: string,
  camaId: string,
): DocumentReference<Cama, Cama> {
  return doc(
    db,
    "hostels",
    hostelId,
    "plantas",
    plantaId,
    "espacios",
    espacioId,
    "camas",
    camaId,
  ) as DocumentReference<Cama, Cama>;
}

export function reservasCollection(
  hostelId: string,
): CollectionReference<Reserva, Reserva> {
  return collection(
    db,
    "hostels",
    hostelId,
    "reservas",
  ) as CollectionReference<Reserva, Reserva>;
}

export function reservaRef(
  hostelId: string,
  reservaId: string,
): DocumentReference<Reserva, Reserva> {
  return doc(
    db,
    "hostels",
    hostelId,
    "reservas",
    reservaId,
  ) as DocumentReference<Reserva, Reserva>;
}

export function bloqueosCollection(
  hostelId: string,
): CollectionReference<Bloqueo, Bloqueo> {
  return collection(
    db,
    "hostels",
    hostelId,
    "bloqueos",
  ) as CollectionReference<Bloqueo, Bloqueo>;
}

export function bloqueoRef(
  hostelId: string,
  bloqueoId: string,
): DocumentReference<Bloqueo, Bloqueo> {
  return doc(
    db,
    "hostels",
    hostelId,
    "bloqueos",
    bloqueoId,
  ) as DocumentReference<Bloqueo, Bloqueo>;
}
