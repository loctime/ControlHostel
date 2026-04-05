import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import { EditBar } from "./EditBar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;

  const app = getFirebaseAdminApp();
  const db = app.firestore();

  const snap = await db
    .collection("hostels")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return notFound();

  const hostelDoc = snap.docs[0];
  const hostelId = hostelDoc.id;
  const hostel = hostelDoc.data() as {
    nombre?: string;
    descripcion?: string;
    slug?: string;
  };

  const nombre = hostel.nombre?.trim() || "Hostel";
  const descripcion = hostel.descripcion?.trim() || "";

  return (
    <>
      <EditBar
        hostelId={hostelId}
        slug={slug}
        initialNombre={nombre}
        initialDescripcion={descripcion}
      />
      <main className="min-h-screen bg-[#0f1623] text-white">
        {/* Hero */}
        <section className="relative flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a2238] to-[#0f1623]" />
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight">{nombre}</h1>
            {descripcion ? (
              <p className="mt-6 text-lg leading-relaxed text-gray-300">{descripcion}</p>
            ) : null}

            <a
              href={`/h/${slug}/reservar`}
              className="mt-10 inline-block rounded-2xl bg-[#7c83ff] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              Reservar ahora
            </a>
          </div>
        </section>

        {/* Info básica */}
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-gray-400">
              ¿Preguntas? Contactanos y te respondemos a la brevedad.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
