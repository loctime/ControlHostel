import { NextResponse } from "next/server";
import { authErrorResponse, requireHostelFromSession } from "@/lib/hostel-api-auth";

export const runtime = "nodejs";

const ESPACIO_TIPOS = new Set(["privada", "compartido", "comun"]);
const CAMA_ESTADOS = new Set(["libre", "ocupada", "bloqueada", "fuera_de_servicio"]);

function asString(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`${field} inválido`);
  return v;
}

function asNonEmptyString(v: unknown, field: string): string {
  const s = asString(v, field).trim();
  if (!s) throw new Error(`${field} es obligatorio`);
  return s;
}

function asNumber(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${field} debe ser un número`);
  return v;
}

function asBool(v: unknown, field: string): boolean {
  if (typeof v !== "boolean") throw new Error(`${field} inválido`);
  return v;
}

type Body = { op?: string; payload?: unknown };

export async function POST(request: Request) {
  const auth = await requireHostelFromSession();
  if (!auth.ok) return auth.response;

  const { db, hostelId } = auth.ctx;
  const hRef = db.collection("hostels").doc(hostelId);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const op = typeof body.op === "string" ? body.op : "";
  const p = body.payload;

  try {
    switch (op) {
      case "updateHostel": {
        const x = p as Record<string, unknown>;
        await hRef.update({
          nombre: asNonEmptyString(x.nombre, "nombre"),
          direccion: typeof x.direccion === "string" ? x.direccion.trim() : "",
        });
        return NextResponse.json({ ok: true });
      }

      case "addPlanta": {
        const x = p as Record<string, unknown>;
        const nombreRaw = typeof x.nombre === "string" ? x.nombre.trim() : "";
        const ref = await hRef.collection("plantas").add({
          nombre: nombreRaw || "Nueva planta",
          orden: asNumber(x.orden, "orden"),
        });
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "updatePlanta": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const nombrePl = typeof x.nombre === "string" ? x.nombre.trim() : "";
        await hRef.collection("plantas").doc(plantaId).update({
          nombre: nombrePl || "Planta",
          orden: asNumber(x.orden, "orden"),
        });
        return NextResponse.json({ ok: true });
      }

      case "deletePlanta": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        await hRef.collection("plantas").doc(plantaId).delete();
        return NextResponse.json({ ok: true });
      }

      case "addEspacio": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const tipo = asString(x.tipo, "tipo");
        if (!ESPACIO_TIPOS.has(tipo)) throw new Error("tipo de espacio inválido");
        const nombreEsp = typeof x.nombre === "string" ? x.nombre.trim() : "";
        const ref = await hRef.collection("plantas").doc(plantaId).collection("espacios").add({
          nombre: nombreEsp || "Nuevo espacio",
          tipo,
          precio: asNumber(x.precio, "precio"),
          activo: asBool(x.activo, "activo"),
        });
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "deleteEspacio": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        await hRef.collection("plantas").doc(plantaId).collection("espacios").doc(espacioId).delete();
        return NextResponse.json({ ok: true });
      }

      case "addCama": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const estado = asString(x.estado, "estado");
        if (!CAMA_ESTADOS.has(estado)) throw new Error("estado de cama inválido");
        const nombreCama = typeof x.nombre === "string" ? x.nombre.trim() : "";
        const ref = await hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId)
          .collection("camas")
          .add({
            nombre: nombreCama || "Nueva cama",
            estado,
            activo: asBool(x.activo, "activo"),
          });
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "updateCama": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const camaId = asNonEmptyString(x.camaId, "camaId");
        const estado = asString(x.estado, "estado");
        if (!CAMA_ESTADOS.has(estado)) throw new Error("estado de cama inválido");
        const nombreC = typeof x.nombre === "string" ? x.nombre.trim() : "";
        await hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId)
          .collection("camas")
          .doc(camaId)
          .update({
            nombre: nombreC || "Cama",
            estado,
            activo: asBool(x.activo, "activo"),
          });
        return NextResponse.json({ ok: true });
      }

      case "deleteCama": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const camaId = asNonEmptyString(x.camaId, "camaId");
        await hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId)
          .collection("camas")
          .doc(camaId)
          .delete();
        return NextResponse.json({ ok: true });
      }

      case "updateEspacioWithCamas": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const tipo = asString(x.tipo, "tipo");
        if (!ESPACIO_TIPOS.has(tipo)) throw new Error("tipo de espacio inválido");
        const camasRaw = x.camas;
        if (!Array.isArray(camasRaw)) throw new Error("camas inválido");

        const batch = db.batch();
        const espacioRef = hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId);
        const nombreEw = typeof x.nombre === "string" ? x.nombre.trim() : "";
        batch.update(espacioRef, {
          nombre: nombreEw || "Espacio",
          tipo,
          precio: asNumber(x.precio, "precio"),
          activo: asBool(x.activo, "activo"),
        });

        for (const row of camasRaw) {
          if (!row || typeof row !== "object") throw new Error("entrada de cama inválida");
          const c = row as Record<string, unknown>;
          const camaId = asNonEmptyString(c.camaId, "camaId");
          const estado = asString(c.estado, "estado");
          if (!CAMA_ESTADOS.has(estado)) throw new Error("estado de cama inválido");
          const camaRef = espacioRef.collection("camas").doc(camaId);
          batch.update(camaRef, {
            estado,
            activo: asBool(c.activo, "activo"),
          });
        }

        await batch.commit();
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Operación no reconocida" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error guardando";
    if (message.includes("inválido") || message.includes("obligatorio")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return authErrorResponse(e);
  }
}
