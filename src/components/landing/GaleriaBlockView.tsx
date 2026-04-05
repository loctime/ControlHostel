import type { GaleriaBlock } from "@/lib/landing-blocks"; 
 
export function GaleriaBlockView({ block }: { block: GaleriaBlock }) { 
  if (block.imagenes.length === 0) return null; 
  const minHeight = block.minHeight ?? 300; 
  const maxWidth = block.maxWidth ?? 1024; 
 
  return ( 
    <section className="px-6 flex flex-col justify-center" style={{ minHeight }}> 
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}> 
        {block.titulo ? ( 
          <h2 className="mb-8 text-center text-3xl font-bold" style={{ fontFamily: "var(--font-titulos)" }}>{block.titulo}</h2> 
        ) : null} 
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"> 
          {block.imagenes.map((img) => ( 
            <div key={img.publicId} className="aspect-square overflow-hidden rounded-2xl"> 
              <img 
                src={img.url} 
                alt={img.alt || "Foto del hostel"} 
                className="h-full w-full object-cover transition hover:scale-105" 
              /> 
            </div> 
          ))} 
        </div> 
      </div> 
    </section> 
  ); 
} 
