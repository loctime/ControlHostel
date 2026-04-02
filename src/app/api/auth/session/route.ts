import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const runtime = "nodejs";
/** 5 días (Firebase permite hasta ~14 días para session cookies). */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken?.trim()) {
      return NextResponse.json({ error: "idToken requerido" }, { status: 400 });
    }

    const adminApp = getFirebaseAdminApp();
    await adminApp.auth().verifyIdToken(idToken);
    const sessionCookie = await adminApp
      .auth()
      .createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error creando sesión";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "No se pudo cerrar sesión" }, { status: 500 });
  }
}
