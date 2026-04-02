import { type NextRequest, NextResponse } from "next/server";
import { decodeProtectedHeader, importX509, jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const PUBLIC_KEYS_URL =
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys";

async function verifyFirebaseSessionCookie(
  token: string,
  projectId: string,
): Promise<void> {
  // La cookie de sesión de Firebase es un JWT firmado. El header trae un `kid`
  // que define cuál cert (de los publicKeys) usar para validar la firma.
  const protectedHeader = decodeProtectedHeader(token);
  const alg = protectedHeader.alg;
  const kid = protectedHeader.kid as string | undefined;

  if (!alg || alg !== "RS256" || !kid) {
    throw new Error("JWT no coincide con el formato esperado");
  }

  const res = await fetch(PUBLIC_KEYS_URL, { method: "GET" });
  if (!res.ok) {
    throw new Error("No se pudieron obtener public keys");
  }
  const publicKeys = (await res.json()) as Record<string, string>;

  const x509cert = publicKeys[kid];
  if (!x509cert) {
    throw new Error("No existe public key para el kid del token");
  }

  const publicKey = await importX509(x509cert, "RS256");

  // Claims equivalentes a ID token:
  // - issuer: https://securetoken.google.com/<projectId>
  // - audience: <projectId>
  await jwtVerify(token, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verifyFirebaseSessionCookie(session, projectId);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
