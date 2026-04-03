import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const runtime = "nodejs";

type Body = { nombre?: string; direccion?: string };

export async function POST(request: Request) {
  const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!session?.trim()) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) {
    return NextResponse.json({ error: "El nombre del hostel es obligatorio" }, { status: 400 });
  }
  const direccion = typeof body.direccion === "string" ? body.direccion.trim() : "";

  try {
    const app = getFirebaseAdminApp();
    const decoded = await app.auth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    const db = app.firestore();
    const usuarioRef = db.doc(`usuarios/${uid}`);
    const usuarioSnap = await usuarioRef.get();
    const existing = usuarioSnap.get("hostelId");
    if (typeof existing === "string" && existing.length > 0) {
      return NextResponse.json({ error: "Ya tenés un hostel asignado" }, { status: 409 });
    }

    const hostelRef = db.collection("hostels").doc();
    const batch = db.batch();
    batch.set(hostelRef, { nombre, direccion });
    batch.set(usuarioRef, { hostelId: hostelRef.id }, { merge: true });
    await batch.commit();

    return NextResponse.json({ ok: true, hostelId: hostelRef.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error creando el hostel";
    const lower = message.toLowerCase();
    if (lower.includes("session") || lower.includes("cookie") || lower.includes("token")) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
