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
  fuente?: string; // nombre de Google Font, ej: "Inter" 
}; 
