import { useState, useEffect } from "react";
import type { LandingBlock, LandingConfig } from "@/lib/landing-blocks";
import { postHostelWrite } from "@/lib/hostel-config-api";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { LandingPreview } from "@/components/landing/LandingPreview";
import type { CloudinaryUploadResult } from "@/lib/cloudinary";
import { PaletaEditor } from "./PaletaEditor";

type Props = {
  hostelId: string;
  slug: string;
  nombre: string;
  initialConfig: LandingConfig | null;
  onClose: () => void;
  onSaved: () => void;
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultBlock(tipo: LandingBlock["tipo"]): LandingBlock {
  const base = { id: generateId(), orden: 0 };
  switch (tipo) {
    case "hero":
      return { ...base, tipo, titulo: "", subtitulo: "", imagenUrl: "", imagenPublicId: "" };
    case "galeria":
      return { ...base, tipo, titulo: "Galería", imagenes: [] };
    case "texto":
      return { ...base, tipo, titulo: "", contenido: "" };
    case "habitaciones":
      return { ...base, tipo, titulo: "Nuestras habitaciones" };
    case "contacto":
      return { ...base, tipo, titulo: "Contacto", email: "", telefono: "", instagram: "", whatsapp: "" };
  }
}

const TIPO_LABELS: Record<LandingBlock["tipo"], string> = {
  hero: "🖼️ Hero",
  galeria: "📷 Galería",
  texto: "📝 Texto",
  habitaciones: "🛏️ Habitaciones",
  contacto: "📞 Contacto",
};

export function EditorLayout({ hostelId, slug, nombre, initialConfig, onClose, onSaved }: Props) {
  const [bloques, setBloques] = useState<LandingBlock[]>(
    () => (initialConfig?.bloques ?? []).slice().sort((a, b) => a.orden - b.orden)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [activeTab, setActiveTab] = useState<"bloques" | "diseno">("bloques"); 
  const [currentPaleta, setCurrentPaleta] = useState<LandingConfig["paleta"]>(initialConfig?.paleta);
  const [currentFuenteTitulos, setCurrentFuenteTitulos] = useState(initialConfig?.fuenteTitulos ?? "Playfair Display");
  const [currentFuenteContenido, setCurrentFuenteContenido] = useState(initialConfig?.fuenteContenido ?? "Inter");

  const paleta = currentPaleta;
  const selectedBlock = bloques.find((b) => b.id === selectedId) ?? null;
  const sortedBloques = bloques.slice().sort((a, b) => a.orden - b.orden);

  useEffect(() => {
    const fonts = [currentFuenteTitulos, currentFuenteContenido].filter(Boolean);
    const id = "gfont-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const family = fonts.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&");
    link.href = `https://fonts.googleapis.com/css2?${family}&display=swap`;
  }, [currentFuenteTitulos, currentFuenteContenido]);

  function addBlock(tipo: LandingBlock["tipo"]) {
    const maxOrden = bloques.reduce((m, b) => Math.max(m, b.orden), -1);
    const newBlock = { ...defaultBlock(tipo), orden: maxOrden + 1 };
    setBloques((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  }

  function removeBlock(id: string) {
    setBloques((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveBlock(id: string, dir: "up" | "down") {
    setBloques((prev) => {
      const sorted = prev.slice().sort((a, b) => a.orden - b.orden);
      const idx = sorted.findIndex((b) => b.id === id);
      if (dir === "up" && idx === 0) return prev;
      if (dir === "down" && idx === sorted.length - 1) return prev;
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      return sorted.map((b, i) => {
        if (i === idx) return { ...b, orden: sorted[swapIdx].orden };
        if (i === swapIdx) return { ...b, orden: sorted[idx].orden };
        return b;
      });
    });
  }

  function updateBlock(updated: LandingBlock) {
    setBloques((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const sorted = bloques.slice().sort((a, b) => a.orden - b.orden);
      const reordered = sorted.map((b, i) => ({ ...b, orden: i }));
      await postHostelWrite({
        op: "updateLandingConfig",
        payload: {
          landingConfig: {
            bloques: reordered,
            paleta: currentPaleta,
            fuenteTitulos: currentFuenteTitulos,
            fuenteContenido: currentFuenteContenido,
          },
        },
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0f1220" }}>
      {/* Topbar del editor */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-5 py-2"
        style={{ borderColor: "rgba(124,131,255,0.2)", background: "#1a1f36" }}
      >
        <span className="rounded-lg bg-[#7c83ff]/20 px-2 py-1 text-xs font-semibold text-[#7c83ff]">
          Modo edición
        </span>
        <span className="text-xs text-gray-500">Los cambios se guardan al hacer click en Guardar</span>
        <div className="ml-auto flex items-center gap-3">
          {error ? <span className="text-xs text-red-400">{error}</span> : null}
          <button
            onClick={() => void onSave()}
            disabled={busy}
            className="rounded-xl bg-[#7c83ff] px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
          >
            Salir del editor
          </button>
        </div>
      </div>

      {/* Layout dividido */}
      <div className="flex flex-1 overflow-hidden">

        {/* Preview — izquierda */}
        <div className="flex-1 overflow-hidden border-r" style={{ borderColor: "rgba(124,131,255,0.15)" }}>
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b px-4 py-1.5 text-xs text-gray-600" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              Preview — /web/{slug}
            </div>
            <div
              className="flex-1 overflow-hidden"
              style={{
                "--font-titulos": `"${currentFuenteTitulos}", serif`,
                "--font-contenido": `"${currentFuenteContenido}", sans-serif`,
              } as React.CSSProperties}
            >
              <LandingPreview
                bloques={bloques}
                paleta={paleta}
                nombre={nombre}
                hostelId={hostelId}
                selectedId={selectedId ?? undefined}
                onSelectBlock={(id) => setSelectedId(id)}
              />
            </div>
          </div>
        </div>

        {/* Panel derecha */} 
        <div 
          className="flex w-96 shrink-0 flex-col" 
          style={{ background: "#1a1f36" }} 
        > 
          {/* Pestañas */} 
          <div className="flex shrink-0 border-b border-white/10"> 
            <button 
              onClick={() => setActiveTab("bloques")} 
              className={`flex-1 py-2.5 text-xs font-semibold transition ${ 
                activeTab === "bloques" 
                  ? "border-b-2 border-[#7c83ff] text-[#7c83ff]" 
                  : "text-gray-500 hover:text-gray-300" 
              }`} 
            > 
              Bloques 
            </button> 
            <button 
              onClick={() => setActiveTab("diseno")} 
              className={`flex-1 py-2.5 text-xs font-semibold transition ${ 
                activeTab === "diseno" 
                  ? "border-b-2 border-[#7c83ff] text-[#7c83ff]" 
                  : "text-gray-500 hover:text-gray-300" 
              }`} 
            > 
              Diseño 
            </button> 
          </div> 
 
          {/* Contenido según pestaña */} 
          {activeTab === "diseno" ? ( 
            <div className="flex-1 overflow-y-auto"> 
              <PaletaEditor 
                paleta={currentPaleta} 
                fuenteTitulos={currentFuenteTitulos} 
                fuenteContenido={currentFuenteContenido} 
                onChange={(p, ft, fc) => { 
                  setCurrentPaleta(p); 
                  setCurrentFuenteTitulos(ft); 
                  setCurrentFuenteContenido(fc); 
                }} 
                onClose={() => setActiveTab("bloques")} 
              /> 
            </div> 
          ) : ( 
            <div className="flex flex-1 overflow-hidden"> 
              {/* Lista de bloques */} 
              <div className="flex w-44 shrink-0 flex-col border-r border-white/10"> 
                <div className="p-3"> 
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"> 
                    Bloques 
                  </div> 
                  <div className="space-y-1"> 
                    {sortedBloques.map((b, idx) => ( 
                      <div 
                        key={b.id} 
                        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition ${ 
                          selectedId === b.id 
                            ? "bg-[#7c83ff]/20 text-[#7c83ff]" 
                            : "text-gray-300 hover:bg-white/5" 
                        }`} 
                        onClick={() => setSelectedId(b.id)} 
                      > 
                        <span className="flex-1 truncate text-xs">{TIPO_LABELS[b.tipo]}</span> 
                        <div className="flex flex-col gap-0.5"> 
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveBlock(b.id, "up"); }} 
                            disabled={idx === 0} 
                            className="text-[10px] leading-none text-gray-500 hover:text-white disabled:opacity-20" 
                          >▲</button> 
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveBlock(b.id, "down"); }} 
                            disabled={idx === sortedBloques.length - 1} 
                            className="text-[10px] leading-none text-gray-500 hover:text-white disabled:opacity-20" 
                          >▼</button> 
                        </div> 
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} 
                          className="text-[10px] text-gray-600 hover:text-red-400" 
                        >✕</button> 
                      </div> 
                    ))} 
                  </div> 
                </div> 
 
                {/* Agregar bloque */} 
                <div className="mt-auto border-t border-white/10 p-3"> 
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"> 
                    Agregar 
                  </div> 
                  <div className="space-y-1"> 
                    {(["hero", "galeria", "texto", "habitaciones", "contacto"] as LandingBlock["tipo"][]).map((tipo) => ( 
                      <button 
                        key={tipo} 
                        onClick={() => addBlock(tipo)} 
                        className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-gray-400 transition hover:bg-white/5 hover:text-white" 
                      > 
                        {TIPO_LABELS[tipo]} 
                      </button> 
                    ))} 
                  </div> 
                </div> 
              </div> 
 
              {/* Formulario del bloque seleccionado */} 
              <div className="flex-1 overflow-y-auto p-4"> 
                {selectedBlock ? ( 
                  <BlockForm block={selectedBlock} onChange={updateBlock} /> 
                ) : ( 
                  <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-500"> 
                    <span className="text-3xl mb-3">👈</span> 
                    Seleccioná un bloque para editarlo, o agregá uno nuevo. 
                  </div> 
                )} 
              </div> 
            </div> 
          )} 
        </div> 
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-400">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#7c83ff] disabled:opacity-50"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={4}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#7c83ff] disabled:opacity-50 resize-none"
    />
  );
}

function SizeControls({
  block,
  onChange,
  defaultHeight = 400,
  defaultWidth = 896,
  maxHeight = 1200,
  maxWidth = 1600,
}: {
  block: LandingBlock;
  onChange: (b: LandingBlock) => void;
  defaultHeight?: number;
  defaultWidth?: number;
  maxHeight?: number;
  maxWidth?: number;
}) {
  const minHeight = block.minHeight ?? defaultHeight;
  const contentWidth = block.maxWidth ?? defaultWidth;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tamaño</div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-gray-400">Altura mínima</span>
          <span className="text-xs font-mono text-gray-300">{minHeight}px</span>
        </div>
        <input
          type="range"
          min={40}
          max={maxHeight}
          step={10}
          value={minHeight}
          onChange={(e) => onChange({ ...block, minHeight: Number(e.target.value) })}
          className="w-full accent-[#7c83ff]"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-gray-400">Ancho del contenido</span>
          <span className="text-xs font-mono text-gray-300">{contentWidth}px</span>
        </div>
        <input
          type="range"
          min={300}
          max={maxWidth}
          step={10}
          value={contentWidth}
          onChange={(e) => onChange({ ...block, maxWidth: Number(e.target.value) })}
          className="w-full accent-[#7c83ff]"
        />
      </div>
    </div>
  );
}

function BlockForm({ block, onChange }: { block: LandingBlock; onChange: (b: LandingBlock) => void }) {
  switch (block.tipo) {
    case "hero":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-white">🖼️ Hero</h3>
          <Field label="Título">
            <Input value={block.titulo} onChange={(e) => onChange({ ...block, titulo: e.target.value })} />
          </Field>
          <Field label="Subtítulo">
            <Input value={block.subtitulo} onChange={(e) => onChange({ ...block, subtitulo: e.target.value })} />
          </Field>
          <Field label="Imagen de fondo">
            {block.imagenUrl ? (
              <div className="mb-2">
                <img src={block.imagenUrl} alt="Hero" className="h-24 w-full rounded-xl object-cover" />
                <button
                  onClick={() => onChange({ ...block, imagenUrl: "", imagenPublicId: "" })}
                  className="mt-1 text-xs text-red-400 hover:text-red-300"
                >
                  Quitar imagen
                </button>
              </div>
            ) : null}
            <ImageUploadButton
              label="Subir imagen de fondo"
              onUploaded={(results: CloudinaryUploadResult[]) => {
                const r = results[0];
                if (r) onChange({ ...block, imagenUrl: r.secure_url, imagenPublicId: r.public_id });
              }}
            />
          </Field>
          <SizeControls block={block} onChange={onChange} defaultHeight={500} defaultWidth={672} />
        </div>
      );

    case "galeria":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-white">📷 Galería</h3>
          <Field label="Título de sección">
            <Input value={block.titulo} onChange={(e) => onChange({ ...block, titulo: e.target.value })} />
          </Field>
          <Field label="Imágenes" hint="Podés subir varias a la vez">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {block.imagenes.map((img) => (
                <div key={img.publicId} className="relative aspect-square">
                  <img src={img.url} alt={img.alt} className="h-full w-full rounded-lg object-cover" />
                  <button
                    onClick={() => onChange({
                      ...block,
                      imagenes: block.imagenes.filter((i) => i.publicId !== img.publicId),
                    })}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-500"
                  >✕</button>
                </div>
              ))}
            </div>
            <ImageUploadButton
              multiple
              label="Agregar fotos"
              onUploaded={(results: CloudinaryUploadResult[]) => {
                const nuevas = results.map((r) => ({
                  url: r.secure_url,
                  publicId: r.public_id,
                  alt: "",
                }));
                onChange({ ...block, imagenes: [...block.imagenes, ...nuevas] });
              }}
            />
          </Field>
          <SizeControls block={block} onChange={onChange} defaultHeight={300} defaultWidth={1024} />
        </div>
      );

    case "texto":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-white">📝 Texto</h3>
          <Field label="Título">
            <Input value={block.titulo} onChange={(e) => onChange({ ...block, titulo: e.target.value })} />
          </Field>
          <Field label="Contenido">
            <Textarea value={block.contenido} onChange={(e) => onChange({ ...block, contenido: e.target.value })} />
          </Field>
          <SizeControls block={block} onChange={onChange} defaultHeight={200} defaultWidth={768} />
        </div>
      );

    case "habitaciones":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-white">🛏️ Habitaciones</h3>
          <Field label="Título de sección">
            <Input value={block.titulo} onChange={(e) => onChange({ ...block, titulo: e.target.value })} />
          </Field>
          <p className="text-xs text-gray-500">
            Las habitaciones se toman automáticamente de los datos del hostel.
          </p>
          <SizeControls block={block} onChange={onChange} defaultHeight={300} defaultWidth={1024} />
        </div>
      );

    case "contacto":
      return ( 
        <div className="space-y-4">
          <h3 className="font-semibold text-white">📞 Contacto</h3>
          <Field label="Título de sección">
            <Input value={block.titulo} onChange={(e) => onChange({ ...block, titulo: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={block.email} onChange={(e) => onChange({ ...block, email: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <Input value={block.telefono} onChange={(e) => onChange({ ...block, telefono: e.target.value })} />
          </Field>
          <Field label="WhatsApp" hint="Solo números con código de país, ej: 5491112345678">
            <Input value={block.whatsapp} onChange={(e) => onChange({ ...block, whatsapp: e.target.value })} />
          </Field>
          <Field label="Instagram" hint="Sin @">
            <Input value={block.instagram} onChange={(e) => onChange({ ...block, instagram: e.target.value })} />
          </Field>
          <SizeControls block={block} onChange={onChange} defaultHeight={300} defaultWidth={672} />
        </div>
      );
  }
}
