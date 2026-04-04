import { NextResponse } from "next/server";
import { authErrorResponse, requireHostelFromSession } from "@/lib/hostel-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireHostelFromSession();
  if (!auth.ok) return auth.response;

  const { db, hostelId } = auth.ctx;

  let body: { bloqueoId?: unknown };
  try {
    body = (await request.json()) as { bloqueoId?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const bloqueoId = body.bloqueoId;
  if (typeof bloqueoId !== "string" || bloqueoId.trim().length === 0) {
    return NextResponse.json({ error: "bloqueoId es obligatorio" }, { status: 400 });
  }

  try {
    await db
      .collection("hostels")
      .doc(hostelId)
      .collection("bloqueos")
      .doc(bloqueoId.trim())
      .delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
