import type { HeroBlock, LandingPaleta } from "@/lib/landing-blocks"; 
 
export function HeroBlockView({ block, paleta }: { block: HeroBlock; paleta?: LandingPaleta }) { 
  const bg = paleta?.fondo ?? "#0f1623"; 
  const color = paleta?.texto ?? "#ffffff"; 
  const accent = paleta?.primario ?? "#7c83ff"; 
 
  return ( 
    <section 
      className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center" 
      style={ 
        block.imagenUrl 
          ? { 
              backgroundImage: `url(${block.imagenUrl})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center", 
            } 
          : { background: bg } 
      } 
    > 
      {block.imagenUrl ? ( 
        <div className="absolute inset-0 bg-black/50" /> 
      ) : null} 
      <div className="relative z-10 max-w-2xl" style={{ color }}> 
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
