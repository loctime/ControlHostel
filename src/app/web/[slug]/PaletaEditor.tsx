"use client"; 
 
import { useState, useRef } from "react"; 
import type { LandingPaleta } from "@/lib/landing-blocks"; 
import { extractPaletaFromImage } from "@/lib/extract-palette"; 
 
const GOOGLE_FONTS = [ 
  "Inter", 
  "Roboto", 
  "Poppins", 
  "Playfair Display", 
  "Montserrat", 
  "Lato", 
  "Raleway", 
  "Nunito", 
  "Open Sans", 
  "Merriweather", 
]; 
 
type Props = { 
  paleta: LandingPaleta | undefined; 
  fuenteTitulos: string | undefined; 
  fuenteContenido: string | undefined; 
  onChange: (paleta: LandingPaleta, fuenteTitulos: string, fuenteContenido: string) => void; 
  onClose: () => void; 
}; 
 
const DEFAULT_PALETA: LandingPaleta = { 
  primario: "#7c83ff", 
  secundario: "#5a62ff", 
  fondo: "#0f1623", 
  texto: "#f0f1f5", 
}; 
 
function Section({ 
  title, 
  sectionKey, 
  open, 
  onToggle, 
  children, 
}: { 
  title: string; 
  sectionKey: string; 
  open: boolean; 
  onToggle: () => void; 
  children: React.ReactNode; 
}) { 
  return ( 
    <div className="rounded-xl border border-white/10 overflow-hidden"> 
      <button 
        type="button" 
        onClick={onToggle} 
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5" 
      > 
        <span className="text-xs font-semibold text-gray-300">{title}</span> 
        <span className="text-xs text-gray-500">{open ? "▲" : "▼"}</span> 
      </button> 
      {open ? ( 
        <div className="border-t border-white/10 px-4 pb-4 pt-3"> 
          {children} 
        </div> 
      ) : null} 
    </div> 
  ); 
} 
 
export function PaletaEditor({ paleta, fuenteTitulos, fuenteContenido, onChange, onClose }: Props) { 
  const [current, setCurrent] = useState<LandingPaleta>(paleta ?? DEFAULT_PALETA); 
  const [currentFuenteTitulos, setCurrentFuenteTitulos] = useState(fuenteTitulos ?? "Playfair Display"); 
  const [currentFuenteContenido, setCurrentFuenteContenido] = useState(fuenteContenido ?? "Inter"); 
  const [extracting, setExtracting] = useState(false); 
  const [extractError, setExtractError] = useState<string | null>(null); 
  const fileRef = useRef<HTMLInputElement>(null); 
 
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 
    extraer: true, 
    colores: false, 
    tipografia: false, 
  }); 
 
  function toggleSection(key: string) { 
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] })); 
  } 
 
  function update(key: keyof LandingPaleta, value: string) { 
    const next = { ...current, [key]: value }; 
    setCurrent(next); 
    onChange(next, currentFuenteTitulos, currentFuenteContenido); 
  } 
 
  function updateFuenteTitulos(f: string) { 
    setCurrentFuenteTitulos(f); 
    onChange(current, f, currentFuenteContenido); 
  } 
 
  function updateFuenteContenido(f: string) { 
    setCurrentFuenteContenido(f); 
    onChange(current, currentFuenteTitulos, f); 
  } 
 
  async function handleImageExtract(file: File) { 
    setExtracting(true); 
    setExtractError(null); 
    try { 
      // Crear URL local temporal — no sube nada a ningún lado 
      const localUrl = URL.createObjectURL(file); 
      const extracted = await extractPaletaFromImage(localUrl); 
      // Liberar la URL temporal 
      URL.revokeObjectURL(localUrl); 
      setCurrent(extracted); 
      onChange(extracted, currentFuenteTitulos, currentFuenteContenido); 
    } catch (e) { 
      setExtractError("No se pudo extraer la paleta. Intentá con otra imagen."); 
    } finally { 
      setExtracting(false); 
    } 
  } 
 
  const COLOR_FIELDS: Array<{ key: keyof LandingPaleta; label: string; hint: string }> = [ 
    { key: "fondo", label: "Color de fondo", hint: "Fondo general de la página" }, 
    { key: "texto", label: "Color de texto", hint: "Texto principal" }, 
    { key: "primario", label: "Color primario", hint: "Botones y acentos principales" }, 
    { key: "secundario", label: "Color secundario", hint: "Acentos secundarios" }, 
  ]; 
 
  return ( 
    <div 
      className="flex h-full flex-col overflow-y-auto" 
      style={{ background: "#1a1f36" }} 
    > 
      <div className="flex items-center border-b border-white/10 px-4 py-3"> 
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide"> 
          Paleta y tipografía 
        </span> 
      </div> 
 
      <div className="space-y-3 p-4"> 
 
        <Section 
          title="🖼️ Obtener colores de una imagen" 
          sectionKey="extraer" 
          open={openSections.extraer} 
          onToggle={() => toggleSection("extraer")} 
        > 
          <p className="mb-3 text-xs text-gray-500"> 
            Subí el logo o una foto del hostel y detectamos los colores automáticamente. 
          </p> 
          <input 
            ref={fileRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => { 
              const file = e.target.files?.[0]; 
              if (file) void handleImageExtract(file); 
              if (fileRef.current) fileRef.current.value = ""; 
            }} 
          /> 
          <button 
            onClick={() => fileRef.current?.click()} 
            disabled={extracting} 
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20 disabled:opacity-50" 
          > 
            {extracting ? ( 
              <> 
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> 
                Detectando colores... 
              </> 
            ) : ( 
              "🖼️ Subir imagen" 
            )} 
          </button> 
          {extractError ? ( 
            <p className="mt-2 text-xs text-red-400">{extractError}</p> 
          ) : null} 
        </Section> 
 
        <Section 
          title="🎨 Editar colores" 
          sectionKey="colores" 
          open={openSections.colores} 
          onToggle={() => toggleSection("colores")} 
        > 
          {/* Preview de la paleta */} 
          <div className="mb-4 flex gap-2"> 
            {COLOR_FIELDS.map(({ key }) => ( 
              <div 
                key={key} 
                className="h-8 flex-1 rounded-lg border border-white/10" 
                style={{ background: current[key] }} 
                title={key} 
              /> 
            ))} 
          </div> 
 
          {/* Color pickers */} 
          <div className="space-y-4"> 
            {COLOR_FIELDS.map(({ key, label, hint }) => ( 
              <div key={key} className="flex items-center gap-3"> 
                <input 
                  type="color" 
                  value={current[key]} 
                  onChange={(e) => update(key, e.target.value)} 
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5" 
                /> 
                <div className="flex-1"> 
                  <div className="text-xs font-medium text-gray-300">{label}</div> 
                  <div className="text-xs text-gray-600">{hint}</div> 
                </div> 
                <input 
                  type="text" 
                  value={current[key]} 
                  onChange={(e) => { 
                    if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) { 
                      update(key, e.target.value); 
                    } 
                  }} 
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white outline-none focus:border-[#7c83ff]" 
                /> 
              </div> 
            ))} 
          </div> 
        </Section> 
 
        <Section 
          title="✍️ Tipografías" 
          sectionKey="tipografia" 
          open={openSections.tipografia} 
          onToggle={() => toggleSection("tipografia")} 
        > 
          {/* Fuente de títulos */} 
          <div className="mb-5"> 
            <div className="mb-2 text-xs font-medium text-gray-400">Títulos (H1, H2, H3)</div> 
            <div 
              className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-2xl font-bold" 
              style={{ fontFamily: currentFuenteTitulos }} 
            > 
              Bienvenidos 
            </div> 
            <div className="grid grid-cols-2 gap-2"> 
              {GOOGLE_FONTS.map((font) => ( 
                <button 
                  key={font} 
                  onClick={() => updateFuenteTitulos(font)} 
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${ 
                    currentFuenteTitulos === font 
                      ? "border-[#7c83ff] bg-[#7c83ff]/20 text-[#7c83ff]" 
                      : "border-white/10 text-gray-300 hover:bg-white/5" 
                  }`} 
                  style={{ fontFamily: font }} 
                > 
                  {font} 
                </button> 
              ))} 
            </div> 
          </div> 
 
          {/* Fuente de contenido */} 
          <div> 
            <div className="mb-2 text-xs font-medium text-gray-400">Contenido (párrafos)</div> 
            <div 
              className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed" 
              style={{ fontFamily: currentFuenteContenido }} 
            > 
              El mejor hostel de la región, con habitaciones cómodas y vista al lago. 
            </div> 
            <div className="grid grid-cols-2 gap-2"> 
              {GOOGLE_FONTS.map((font) => ( 
                <button 
                  key={font} 
                  onClick={() => updateFuenteContenido(font)} 
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${ 
                    currentFuenteContenido === font 
                      ? "border-[#7c83ff] bg-[#7c83ff]/20 text-[#7c83ff]" 
                      : "border-white/10 text-gray-300 hover:bg-white/5" 
                  }`} 
                  style={{ fontFamily: font }} 
                > 
                  {font} 
                </button> 
              ))} 
            </div> 
          </div> 
        </Section> 
 
      </div> 
    </div> 
  ); 
} 
