import type { TextoBlock } from "@/lib/landing-blocks"; 
 
export function TextoBlockView({ block }: { block: TextoBlock }) { 
  return ( 
    <section className="mx-auto max-w-3xl px-6 py-16"> 
      {block.titulo ? ( 
        <h2 className="mb-6 text-3xl font-bold">{block.titulo}</h2> 
      ) : null} 
      {block.contenido ? ( 
        <p className="text-lg leading-relaxed opacity-80">{block.contenido}</p> 
      ) : null} 
    </section> 
  ); 
} 
