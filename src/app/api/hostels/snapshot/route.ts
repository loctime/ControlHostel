import type { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const runtime = "nodejs";

function toMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as AdminTimestamp).toMillis === "function") {
    return (v as AdminTimestamp).toMillis();
  }
  if (v && typeof v === "object" && "_seconds" in v) {
    const s = (v as { _seconds?: number })._seconds;
    const n = (v as { _nanoseconds?: number })._nanoseconds ?? 0;
    if (typeof s === "number") return s * 1000 + Math.floor(n / 1e6);
  }
  throw new Error("Timestamp inválido en reserva");
}

export async function GET() {
  const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!session?.trim()) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const app = getFirebaseAdminApp();
    const decoded = await app.auth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const db = app.firestore();

    const usuarioSnap = await db.doc(`usuarios/${uid}`).get();
    const rawHid = usuarioSnap.get("hostelId");
    if (typeof rawHid !== "string" || rawHid.length === 0) {
      return NextResponse.json({ error: "Sin hostel asignado" }, { status: 403 });
    }
    const hostelId = rawHid;

    const plantasSnap = await db
      .collection("hostels")
      .doc(hostelId)
      .collection("plantas")
      .orderBy("orden", "asc")
      .get();

    const plantas = plantasSnap.docs.map((d) => ({ id: d.id, data: d.data() }));

    const espaciosByPlanta: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};
    const camasByEspacio: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};

    for (const p of plantas) {
      const espSnap = await db
        .collection("hostels")
        .doc(hostelId)
        .collection("plantas")
        .doc(p.id)
        .collection("espacios")
        .orderBy("nombre", "asc")
        .get();

      const espacios = espSnap.docs.map((d) => ({ id: d.id, data: d.data() }));
      espaciosByPlanta[p.id] = espacios;

      for (const e of espacios) {
        const key = `${p.id}/${e.id}`;
        const camSnap = await db
          .collection("hostels")
          .doc(hostelId)
          .collection("plantas")
          .doc(p.id)
          .collection("espacios")
          .doc(e.id)
          .collection("camas")
          .orderBy("nombre", "asc")
          .get();

        camasByEspacio[key] = camSnap.docs.map((d) => ({ id: d.id, data: d.data() }));
      }
    }

    const resSnap = await db
      .collection("hostels")
      .doc(hostelId)
      .collection("reservas")
      .orderBy("checkin", "desc")
      .get();

    const reservas = resSnap.docs.map((d) => {
      const data = d.data();
      const { checkin, checkout, ...rest } = data;
      return {
        id: d.id,
        data: {
          ...rest,
          checkinMillis: toMillis(checkin),
          checkoutMillis: toMillis(checkout),
        },
      };
    });

    const hostelSnap = await db.collection("hostels").doc(hostelId).get();
    const hostel = hostelSnap.exists ? hostelSnap.data() : null;

    const bloqueosSnap = await db
      .collection("hostels")
      .doc(hostelId)
      .collection("bloqueos")
      .orderBy("desde", "desc")
      .get();

    const bloqueos = bloqueosSnap.docs.map((d) => {
      const data = d.data();
      const { desde, hasta, ...rest } = data;
      return {
        id: d.id,
        data: {
          ...rest,
          desdeMillis: toMillis(desde),
          hastaMillis: toMillis(hasta),
        },
      };
    });

    return NextResponse.json({
      hostelId,
      hostel,
      plantas,
      espaciosByPlanta,
      camasByEspacio,
      reservas,
      bloqueos,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error leyendo datos";
    const lower = message.toLowerCase();
    if (lower.includes("session") || lower.includes("cookie") || lower.includes("token")) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
