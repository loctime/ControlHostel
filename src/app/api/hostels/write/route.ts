import { NextResponse } from "next/server";
import { authErrorResponse, requireHostelFromSession } from "@/lib/hostel-api-auth";

export const runtime = "nodejs";

const ESPACIO_TIPOS = new Set(["privada", "compartido", "comun"]);
const CAMA_ESTADOS = new Set(["libre", "ocupada", "bloqueada", "fuera_de_servicio"]);
const PLANTA_COLOR_IDS = new Set([
  "azul",
  "verde",
  "amarillo",
  "salmon",
  "ambar",
  "lavanda",
  "violeta",
  "rosa",
  "teal",
]);

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

  const { db, hostelId, uid } = auth.ctx;
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
        const nombre = asNonEmptyString(x.nombre, "nombre");
        const direccion = typeof x.direccion === "string" ? x.direccion.trim() : "";
        const descripcion = typeof x.descripcion === "string" ? x.descripcion.trim() : "";

        let slugFinal = "";

        if (typeof x.slugNombre === "string" && x.slugNombre.trim()) {
          // Normalización estricta
          const slugNombreNorm = x.slugNombre
            .trim()
            .normalize("NFD")
            .replace(/\p{M}/gu, "") // eliminar tildes
            .toLowerCase()
            .replace(/(.)\1+/g, "$1") // colapsar letras repetidas
            .replace(/\s+/g, "") // eliminar espacios
            .replace(/[^a-z0-9]/g, ""); // solo letras y números

          if (!slugNombreNorm) {
            return NextResponse.json(
              { error: "El nombre del slug no puede estar vacío" },
              { status: 400 },
            );
          }

          // Obtener o crear idWeb para este usuario
          const usuarioRef = db.doc(`usuarios/${uid}`);
          const usuarioSnap = await usuarioRef.get();
          let idWeb: number = usuarioSnap.get("idWeb");

          if (!idWeb) {
            // Generar nuevo idWeb con contador global atómico
            const counterRef = db.doc("config/counters");
            await db.runTransaction(async (tx) => {
              const counterSnap = await tx.get(counterRef);
              const current = counterSnap.exists
                ? (counterSnap.get("idWebCounter") as number ?? 0)
                : 0;
              const next = current + 1;
              tx.set(counterRef, { idWebCounter: next }, { merge: true });
              tx.update(usuarioRef, { idWeb: next });
              idWeb = next;
            });
          }

          slugFinal = slugNombreNorm + String(idWeb);

          // Verificar unicidad (por si acaso)
          const existing = await db
            .collection("hostels")
            .where("slug", "==", slugFinal)
            .limit(2)
            .get();
          const conflict = existing.docs.find((d) => d.id !== hostelId);
          if (conflict) {
            return NextResponse.json({ error: "Este slug ya está en uso" }, { status: 409 });
          }

          await hRef.update({
            nombre,
            direccion,
            descripcion,
            slug: slugFinal,
            slugNombre: slugNombreNorm,
          });
        } else {
          await hRef.update({ nombre, direccion, descripcion });
        }

        return NextResponse.json({ ok: true });
      }

      case "addPlanta": {
        const x = p as Record<string, unknown>;
        const nombreRaw = typeof x.nombre === "string" ? x.nombre.trim() : "";
        const colorRaw = typeof x.color === "string" ? x.color.trim() : "";
        if (colorRaw !== "" && !PLANTA_COLOR_IDS.has(colorRaw)) {
          throw new Error("color de planta inválido");
        }
        const ref = await hRef.collection("plantas").add({
          nombre: nombreRaw || "Nueva planta",
          orden: asNumber(x.orden, "orden"),
          color: colorRaw,
        });
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "updatePlanta": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const nombrePl = typeof x.nombre === "string" ? x.nombre.trim() : "";
        const colorRaw = typeof x.color === "string" ? x.color.trim() : "";
        if (colorRaw !== "" && !PLANTA_COLOR_IDS.has(colorRaw)) {
          throw new Error("color de planta inválido");
        }
        await hRef.collection("plantas").doc(plantaId).update({
          nombre: nombrePl || "Planta",
          orden: asNumber(x.orden, "orden"),
          color: colorRaw,
        });
        return NextResponse.json({ ok: true });
      }

      case "deletePlanta": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const plantaRef = hRef.collection("plantas").doc(plantaId);
        const espaciosSnap = await plantaRef.collection("espacios").get();
        const batch = db.batch();
        for (const espacioDoc of espaciosSnap.docs) {
          const camasSnap = await espacioDoc.ref.collection("camas").get();
          for (const camaDoc of camasSnap.docs) {
            batch.delete(camaDoc.ref);
          }
          batch.delete(espacioDoc.ref);
        }
        batch.delete(plantaRef);
        await batch.commit();
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
        if (tipo !== "comun") {
          await hRef
            .collection("plantas")
            .doc(plantaId)
            .collection("espacios")
            .doc(ref.id)
            .collection("camas")
            .add({
              nombre: "Cama 1",
              estado: "libre",
              activo: true,
            });
        }
        return NextResponse.json({ ok: true, id: ref.id });
      }

      case "deleteEspacio": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const espacioRef = hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId);
        const camasSnap = await espacioRef.collection("camas").get();
        const batch = db.batch();
        for (const camaDoc of camasSnap.docs) {
          batch.delete(camaDoc.ref);
        }
        batch.delete(espacioRef);
        await batch.commit();
        return NextResponse.json({ ok: true });
      }

      case "addCama": {
        const x = p as Record<string, unknown>;
        const plantaId = asNonEmptyString(x.plantaId, "plantaId");
        const espacioId = asNonEmptyString(x.espacioId, "espacioId");
        const estado = asString(x.estado, "estado");
        if (!CAMA_ESTADOS.has(estado)) throw new Error("estado de cama inválido");
        const existingSnap = await hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId)
          .collection("camas")
          .count()
          .get();
        const count = existingSnap.data().count;
        const nombreFinal = String(count + 1);
        const ref = await hRef
          .collection("plantas")
          .doc(plantaId)
          .collection("espacios")
          .doc(espacioId)
          .collection("camas")
          .add({
            nombre: nombreFinal,
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

      case "updateLandingConfig": {
        const x = p as Record<string, unknown>;
        if (!x.landingConfig || typeof x.landingConfig !== "object") {
          return NextResponse.json({ error: "landingConfig inválido" }, { status: 400 });
        }
        await hRef.update({ landingConfig: x.landingConfig });
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
