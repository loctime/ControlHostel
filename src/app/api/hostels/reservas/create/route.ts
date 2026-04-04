import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authErrorResponse, requireHostelFromSession } from "@/lib/hostel-api-auth";

export const runtime = "nodejs";

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${field} es obligatorio`);
  }
  return value.trim();
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestError(`${field} debe ser un número válido`);
  }
  return value;
}

function asEstado(value: unknown): "pendiente" | "confirmada" {
  if (value === "pendiente" || value === "confirmada") return value;
  throw new BadRequestError('estado debe ser "pendiente" o "confirmada"');
}

function parseHuesped(value: unknown): {
  nombre: string;
  telefono: string;
  email: string;
  dni: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("huesped inválido");
  }
  const o = value as Record<string, unknown>;
  const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
  if (!nombre) {
    throw new BadRequestError("huesped.nombre es obligatorio");
  }
  return {
    nombre,
    telefono: typeof o.telefono === "string" ? o.telefono.trim() : "",
    email: typeof o.email === "string" ? o.email.trim() : "",
    dni: typeof o.dni === "string" ? o.dni.trim() : "",
  };
}

function parseBody(raw: unknown): {
  plantaId: string;
  espacioId: string;
  camaId: string;
  checkinMillis: number;
  checkoutMillis: number;
  estado: "pendiente" | "confirmada";
  huesped: { nombre: string; telefono: string; email: string; dni: string };
  notas: string;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestError("Cuerpo JSON inválido");
  }
  const b = raw as Record<string, unknown>;

  const plantaId = asNonEmptyString(b.plantaId, "plantaId");
  const espacioId = asNonEmptyString(b.espacioId, "espacioId");
  const camaId = asNonEmptyString(b.camaId, "camaId");
  const checkinMillis = asFiniteNumber(b.checkinMillis, "checkinMillis");
  const checkoutMillis = asFiniteNumber(b.checkoutMillis, "checkoutMillis");
  if (checkoutMillis <= checkinMillis) {
    throw new BadRequestError("checkoutMillis debe ser mayor que checkinMillis");
  }

  const estado = asEstado(b.estado);
  const huesped = parseHuesped(b.huesped);
  const notas = typeof b.notas === "string" ? b.notas.trim() : "";

  return {
    plantaId,
    espacioId,
    camaId,
    checkinMillis,
    checkoutMillis,
    estado,
    huesped,
    notas,
  };
}

export async function POST(request: Request) {
  const auth = await requireHostelFromSession();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const body = parseBody(raw);
    const { db, hostelId } = auth.ctx;

    const ref = await db
      .collection("hostels")
      .doc(hostelId)
      .collection("reservas")
      .add({
        plantaId: body.plantaId,
        espacioId: body.espacioId,
        camaId: body.camaId,
        checkin: Timestamp.fromMillis(body.checkinMillis),
        checkout: Timestamp.fromMillis(body.checkoutMillis),
        estado: body.estado,
        huesped: body.huesped,
        notas: body.notas,
      });

    return NextResponse.json({ ok: true, reservaId: ref.id });
  } catch (e: unknown) {
    if (e instanceof BadRequestError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return authErrorResponse(e);
  }
}
