import type { HabitacionesBlock } from "@/lib/landing-blocks"; 
 
export function HabitacionesBlockView({ 
  block, 
  hostelId, 
}: { 
  block: HabitacionesBlock; 
  hostelId?: string; 
}) { 
  return ( 
    <section className="mx-auto max-w-5xl px-6 py-16"> 
      <h2 className="mb-8 text-center text-3xl font-bold"> 
        {block.titulo || "Nuestras habitaciones"} 
      </h2> 
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"> 
        <p className="text-sm opacity-60">Las habitaciones se cargan desde los datos del hostel.</p> 
      </div> 
    </section> 
  ); 
} 
