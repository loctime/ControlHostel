import type { ContactoBlock } from "@/lib/landing-blocks"; 
 
export function ContactoBlockView({ block }: { block: ContactoBlock }) { 
  const minHeight = block.minHeight ?? 300; 
  const maxWidth = block.maxWidth ?? 672; 
 
  return ( 
    <section id="contacto" className="px-6 flex flex-col justify-center" style={{ minHeight }}> 
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}> 
        <h2 className="mb-8 text-center text-3xl font-bold"> 
          {block.titulo || "Contacto"} 
        </h2> 
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8"> 
          {block.email ? ( 
            <a href={`mailto:${block.email}`} className="text-sm opacity-80 hover:opacity-100"> 
              ✉️ {block.email} 
            </a> 
          ) : null} 
          {block.telefono ? ( 
            <a href={`tel:${block.telefono}`} className="text-sm opacity-80 hover:opacity-100"> 
              📞 {block.telefono} 
            </a> 
          ) : null} 
          {block.whatsapp ? ( 
            <a 
              href={`https://wa.me/${block.whatsapp.replace(/\D/g, "")}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm opacity-80 hover:opacity-100" 
            > 
              💬 WhatsApp 
            </a> 
          ) : null} 
          {block.instagram ? ( 
            <a 
              href={`https://instagram.com/${block.instagram.replace("@", "")}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm opacity-80 hover:opacity-100" 
            > 
              📸 @{block.instagram.replace("@", "")} 
            </a> 
          ) : null} 
        </div> 
      </div> 
    </section> 
  ); 
} 
