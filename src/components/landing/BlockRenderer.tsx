import type { LandingBlock, LandingPaleta } from "@/lib/landing-blocks"; 
import { HeroBlockView } from "./HeroBlockView"; 
import { GaleriaBlockView } from "./GaleriaBlockView"; 
import { TextoBlockView } from "./TextoBlockView"; 
import { HabitacionesBlockView } from "./HabitacionesBlockView"; 
import { ContactoBlockView } from "./ContactoBlockView"; 
 
type Props = { 
  block: LandingBlock; 
  paleta?: LandingPaleta; 
  hostelId?: string; 
}; 
 
export function BlockRenderer({ block, paleta, hostelId }: Props) { 
  switch (block.tipo) { 
    case "hero": 
      return <HeroBlockView block={block} paleta={paleta} />; 
    case "galeria": 
      return <GaleriaBlockView block={block} />; 
    case "texto": 
      return <TextoBlockView block={block} />; 
    case "habitaciones": 
      return <HabitacionesBlockView block={block} hostelId={hostelId} />; 
    case "contacto": 
      return <ContactoBlockView block={block} />; 
  } 
} 
