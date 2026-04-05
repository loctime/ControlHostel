import { getFirebaseAdminApp } from "@/lib/firebase-admin"; 
import { notFound } from "next/navigation"; 
import { EditBar } from "./EditBar"; 
import { BlockRenderer } from "@/components/landing/BlockRenderer"; 
import type { LandingConfig } from "@/lib/landing-blocks"; 
 
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
    landingConfig?: LandingConfig; 
  }; 
 
  const nombre = hostel.nombre?.trim() || "Hostel"; 
  const descripcion = hostel.descripcion?.trim() || ""; 
  const landingConfig = hostel.landingConfig ?? null; 
 
  // Si no tiene bloques configurados, mostrar landing básica por defecto 
  const bloques = landingConfig?.bloques ?? []; 
  const paleta = landingConfig?.paleta; 
 
  const bgColor = paleta?.fondo ?? "#0f1623"; 
  const textColor = paleta?.texto ?? "#ffffff"; 
 
  const fuenteTitulos = landingConfig?.fuenteTitulos ?? "Playfair Display"; 
  const fuenteContenido = landingConfig?.fuenteContenido ?? "Inter"; 
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fuenteTitulos.replace(/ /g, "+")}:wght@400;600;700&family=${fuenteContenido.replace(/ /g, "+")}:wght@400;600;700&display=swap`; 
 
  return ( 
    <> 
      <link rel="stylesheet" href={googleFontsUrl} /> 
      <EditBar 
        hostelId={hostelId} 
        slug={slug} 
        initialNombre={nombre} 
        initialDescripcion={descripcion} 
        landingConfig={landingConfig} 
      /> 
      <main 
        className="min-h-screen" 
        style={{ 
          background: bgColor, 
          color: textColor, 
          "--font-titulos": `"${fuenteTitulos}", serif`, 
          "--font-contenido": `"${fuenteContenido}", sans-serif`, 
        } as React.CSSProperties} 
      > 
        {bloques.length === 0 ? ( 
          // Landing por defecto si no hay bloques 
          <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center"> 
            <h1 className="text-5xl font-bold">{nombre}</h1> 
            {descripcion ? ( 
              <p className="mt-6 text-lg opacity-70">{descripcion}</p> 
            ) : null} 
            <p className="mt-4 text-sm opacity-40"> 
              {/* Solo visible para el dueño logueado via EditBar */} 
              Configurá tu landing desde el panel de edición ↑ 
            </p> 
          </section> 
        ) : ( 
          bloques 
            .slice() 
            .sort((a, b) => a.orden - b.orden) 
            .map((bloque) => ( 
              <BlockRenderer 
                key={bloque.id} 
                block={bloque} 
                paleta={paleta} 
                hostelId={hostelId} 
              /> 
            )) 
        )} 
      </main> 
    </> 
  ); 
} 
