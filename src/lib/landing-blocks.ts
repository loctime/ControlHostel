export type BlockBase = { 
  id: string; 
  orden: number; 
  minHeight?: number;  // altura mínima en px, default 400 
  maxWidth?: number;   // ancho máximo del contenido en px, default 896 (max-w-4xl) 
}; 
 
export type HeroBlock = BlockBase & { 
  tipo: "hero"; 
  titulo: string; 
  subtitulo: string; 
  imagenUrl: string; 
  imagenPublicId: string; 
}; 
 
export type GaleriaBlock = BlockBase & { 
  tipo: "galeria"; 
  titulo: string; 
  imagenes: Array<{ url: string; publicId: string; alt: string }>; 
}; 
 
export type TextoBlock = BlockBase & { 
  tipo: "texto"; 
  titulo: string; 
  contenido: string; 
}; 
 
export type HabitacionesBlock = BlockBase & { 
  tipo: "habitaciones"; 
  titulo: string; 
}; 
 
export type ContactoBlock = BlockBase & { 
  tipo: "contacto"; 
  titulo: string; 
  email: string; 
  telefono: string; 
  instagram: string; 
  whatsapp: string; 
}; 
 
export type LandingBlock = 
  | HeroBlock 
  | GaleriaBlock 
  | TextoBlock 
  | HabitacionesBlock 
  | ContactoBlock; 
 
export type LandingPaleta = { 
  primario: string;    // color principal (ej: "#7c83ff") 
  secundario: string;  // color secundario 
  fondo: string;       // color de fondo 
  texto: string;       // color de texto 
}; 
 
export type LandingConfig = { 
  bloques: LandingBlock[]; 
  paleta?: LandingPaleta; 
  fuenteTitulos?: string;  // Google Font para h1, h2, h3 
  fuenteContenido?: string; // Google Font para párrafos y texto general 
};

/** 
 * Dado un color hex de fondo, devuelve "#ffffff" o "#000000" 
 * según cuál tenga mejor contraste (legibilidad). 
 */
export function contrastColor(hex: string): "#ffffff" | "#000000" {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 128 ? "#000000" : "#ffffff";
} 
