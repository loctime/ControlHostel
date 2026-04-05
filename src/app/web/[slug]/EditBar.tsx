"use client"; 
 
import { useEffect, useState } from "react"; 
import { useRouter } from "next/navigation"; 
import type { LandingConfig } from "@/lib/landing-blocks"; 
import { EditorLayout } from "./EditorLayout"; 
 
type Props = { 
  hostelId: string; 
  slug: string; 
  initialNombre: string; 
  initialDescripcion: string; 
  landingConfig: LandingConfig | null; 
}; 
 
export function EditBar({ hostelId, slug, initialNombre, initialDescripcion, landingConfig }: Props) { 
  const [isOwner, setIsOwner] = useState(false); 
  const [editorOpen, setEditorOpen] = useState(false); 
  const router = useRouter(); 
 
  useEffect(() => { 
    fetch("/api/hostels/snapshot") 
      .then((r) => (r.ok ? r.json() : null)) 
      .then((data) => { 
        if (data?.hostelId === hostelId || data?.hostel) { 
          setIsOwner(true); 
        } 
      }) 
      .catch(() => null); 
  }, [hostelId]); 
 
  if (!isOwner) return null; 
 
  return ( 
    <> 
      {!editorOpen ? ( 
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 40, 
            background: "rgba(28, 32, 56, 0.97)", 
            borderBottom: "1px solid rgba(124,131,255,0.3)", 
            backdropFilter: "blur(8px)", 
          }} 
        > 
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2"> 
            <span className="shrink-0 rounded-lg bg-[#7c83ff]/20 px-2 py-1 text-xs font-semibold text-[#7c83ff]"> 
              Modo edición 
            </span> 
            <button 
              onClick={() => setEditorOpen(true)} 
              className="text-sm text-gray-300 hover:text-white" 
            > 
              ✏️ Editar landing 
            </button> 
             
            <a 
              href="/configuracion" 
              className="ml-auto text-xs text-gray-500 hover:text-gray-300" 
            > 
              ⚙️ Configuración 
            </a> 
          </div> 
        </div> 
      ) : null} 
 
      {editorOpen ? ( 
        <EditorLayout 
          hostelId={hostelId} 
          slug={slug} 
          nombre={initialNombre} 
          initialConfig={landingConfig} 
          onClose={() => setEditorOpen(false)} 
          onSaved={() => { 
            // Refresca los datos del servidor sin recargar la página 
            router.refresh(); 
          }} 
        /> 
      ) : null} 
    </> 
  ); 
} 
