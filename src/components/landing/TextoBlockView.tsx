import type { TextoBlock } from "@/lib/landing-blocks"; 
 
export function TextoBlockView({ block }: { block: TextoBlock }) { 
  const minHeight = block.minHeight ?? 200; 
  const maxWidth = block.maxWidth ?? 768; 
 
  return ( 
    <section className="px-6 flex flex-col justify-center" style={{ minHeight }}> 
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}> 
        {block.titulo ? ( 
          <h2 className="mb-6 text-3xl font-bold" style={{ fontFamily: "var(--font-titulos)" }}>{block.titulo}</h2> 
        ) : null} 
        {block.contenido ? ( 
          <div 
            className="text-lg leading-relaxed opacity-80 prose prose-invert max-w-none" 
            style={{ fontFamily: "var(--font-contenido)" }} 
            dangerouslySetInnerHTML={{ __html: block.contenido }} 
          /> 
        ) : null} 
      </div> 
    </section> 
  ); 
} 
