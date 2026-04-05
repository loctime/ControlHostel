import type { GaleriaBlock } from "@/lib/landing-blocks"; 
 
export function GaleriaBlockView({ block }: { block: GaleriaBlock }) { 
  if (block.imagenes.length === 0) return null; 
  return ( 
    <section className="mx-auto max-w-5xl px-6 py-16"> 
      {block.titulo ? ( 
        <h2 className="mb-8 text-center text-3xl font-bold">{block.titulo}</h2> 
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
    </section> 
  ); 
} 
