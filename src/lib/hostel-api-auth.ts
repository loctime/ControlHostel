import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";
import type { Firestore } from "firebase-admin/firestore";

export type AuthorizedHostelContext = {
  db: Firestore;
  hostelId: string;
  uid: string;
};

export async function requireHostelFromSession(): Promise<
  { ok: true; ctx: AuthorizedHostelContext } | { ok: false; response: NextResponse }
> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!session?.trim()) {
    return { ok: false, response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  try {
    const app = getFirebaseAdminApp();
    const decoded = await app.auth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const db = app.firestore();

    const usuarioSnap = await db.doc(`usuarios/${uid}`).get();
    const rawHid = usuarioSnap.get("hostelId");
    if (typeof rawHid !== "string" || rawHid.length === 0) {
      return { ok: false, response: NextResponse.json({ error: "Sin hostel asignado" }, { status: 403 }) };
    }

    return { ok: true, ctx: { db, hostelId: rawHid, uid } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sesión inválida";
    const lower = message.toLowerCase();
    if (lower.includes("session") || lower.includes("cookie") || lower.includes("token")) {
      return { ok: false, response: NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 }) };
    }
    return { ok: false, response: NextResponse.json({ error: message }, { status: 500 }) };
  }
}

export function authErrorResponse(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : "Error en el servidor";
  return NextResponse.json({ error: message }, { status: 500 });
}
