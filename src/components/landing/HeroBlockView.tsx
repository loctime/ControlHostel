import type { HeroBlock, LandingPaleta } from "@/lib/landing-blocks"; 
 
export function HeroBlockView({ block, paleta }: { block: HeroBlock; paleta?: LandingPaleta }) { 
  const bg = paleta?.fondo ?? "#0f1623"; 
  const color = paleta?.texto ?? "#ffffff"; 
  const accent = paleta?.primario ?? "#7c83ff"; 
  const minHeight = block.minHeight ?? 500; 
  const maxWidth = block.maxWidth ?? 672; 
 
  return ( 
    <section 
      className="relative flex flex-col items-center justify-center px-6 text-center" 
      style={ 
        block.imagenUrl 
          ? { 
              backgroundImage: `url(${block.imagenUrl})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center", 
              minHeight, 
            } 
          : { background: bg, minHeight } 
      } 
    > 
      {block.imagenUrl ? <div className="absolute inset-0 bg-black/50" /> : null} 
      <div className="relative z-10" style={{ color, maxWidth, width: "100%" }}> 
        <h1 className="text-5xl font-bold tracking-tight">{block.titulo || "Bienvenidos"}</h1> 
        {block.subtitulo ? ( 
          <p className="mt-6 text-lg leading-relaxed opacity-80">{block.subtitulo}</p> 
        ) : null} 
         
        <a 
          href="#contacto" 
          className="mt-10 inline-block rounded-2xl px-8 py-4 text-base font-semibold shadow-lg transition hover:opacity-90" 
          style={{ background: accent, color: "#fff" }} 
        > 
          Reservar ahora 
        </a> 
      </div> 
    </section> 
  ); 
} 
