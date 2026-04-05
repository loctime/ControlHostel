"use client"; 
 
import type { LandingBlock, LandingPaleta } from "@/lib/landing-blocks"; 
import { BlockRenderer } from "./BlockRenderer"; 
 
type Props = { 
  bloques: LandingBlock[]; 
  paleta?: LandingPaleta; 
  nombre: string; 
  hostelId?: string; 
  selectedId?: string; 
  onSelectBlock?: (id: string) => void; 
}; 
 
export function LandingPreview({ bloques, paleta, nombre, hostelId, selectedId, onSelectBlock }: Props) { 
  const bgColor = paleta?.fondo ?? "#0f1623"; 
  const textColor = paleta?.texto ?? "#ffffff"; 
  const sorted = bloques.slice().sort((a, b) => a.orden - b.orden); 
 
  return ( 
    <div 
      className="h-full w-full overflow-y-auto" 
      style={{ background: bgColor, color: textColor }} 
    > 
      {sorted.length === 0 ? ( 
        <div className="flex h-full flex-col items-center justify-center text-center px-8"> 
          <span className="text-5xl mb-4">🏨</span> 
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>{nombre}</h1> 
          <p className="mt-4 text-sm opacity-40"> 
            Agregá bloques desde el panel para construir tu landing → 
          </p> 
        </div> 
      ) : ( 
        sorted.map((bloque) => { 
          const isSelected = bloque.id === selectedId; 
          return ( 
            <div 
              key={bloque.id} 
              onClick={() => onSelectBlock?.(bloque.id)} 
              style={{ 
                position: "relative", 
                outline: isSelected 
                  ? "2px solid #7c83ff" 
                  : "2px solid transparent", 
                outlineOffset: "-2px", 
                cursor: "pointer", 
                transition: "outline 0.15s", 
              }} 
            > 
              {/* Etiqueta del bloque seleccionado */} 
              {isSelected ? ( 
                <div 
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    zIndex: 10, 
                    background: "#7c83ff", 
                    color: "#fff", 
                    fontSize: 10, 
                    fontWeight: 600, 
                    padding: "2px 8px", 
                    borderBottomRightRadius: 6, 
                    pointerEvents: "none", 
                    userSelect: "none", 
                  }} 
                > 
                  {bloque.tipo.toUpperCase()} 
                </div> 
              ) : null} 
 
              {/* Overlay hover si no está seleccionado */} 
              {!isSelected ? ( 
                <div 
                  style={{ 
                    position: "absolute", 
                    inset: 0, 
                    zIndex: 5, 
                    background: "rgba(124,131,255,0.03)", 
                    pointerEvents: "none", 
                    transition: "background 0.15s", 
                  }} 
                  className="hover:!bg-[rgba(124,131,255,0.07)]" 
                /> 
              ) : null} 
 
              <BlockRenderer 
                block={bloque} 
                paleta={paleta} 
                hostelId={hostelId} 
              /> 
            </div> 
          ); 
        }) 
      )} 
    </div> 
  ); 
} 
