"use client"; 
 
export type RGB = { r: number; g: number; b: number }; 
 
function rgbToHex({ r, g, b }: RGB): string { 
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""); 
} 
 
function getImageData(img: HTMLImageElement, sampleSize = 100): Uint8ClampedArray { 
  const canvas = document.createElement("canvas"); 
  canvas.width = sampleSize; 
  canvas.height = sampleSize; 
  const ctx = canvas.getContext("2d")!; 
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize); 
  return ctx.getImageData(0, 0, sampleSize, sampleSize).data; 
} 
 
function quantizeColors(data: Uint8ClampedArray, buckets = 8): RGB[] { 
  const counts: Record<string, { rgb: RGB; count: number }> = {}; 
  for (let i = 0; i < data.length; i += 4) { 
    const r = Math.round(data[i] / buckets) * buckets; 
    const g = Math.round(data[i + 1] / buckets) * buckets; 
    const b = Math.round(data[i + 2] / buckets) * buckets; 
    const a = data[i + 3]; 
    if (a < 128) continue; // ignorar transparentes 
    const key = `${r},${g},${b}`; 
    if (!counts[key]) counts[key] = { rgb: { r, g, b }, count: 0 }; 
    counts[key].count++; 
  } 
  return Object.values(counts) 
    .sort((a, b) => b.count - a.count) 
    .slice(0, 10) 
    .map((c) => c.rgb); 
} 
 
function luminance({ r, g, b }: RGB): number { 
  return 0.299 * r + 0.587 * g + 0.114 * b; 
} 
 
function isDark(rgb: RGB): boolean { 
  return luminance(rgb) < 128; 
} 
 
function isLight(rgb: RGB): boolean { 
  return luminance(rgb) >= 200; 
} 
 
export type ExtractedPaleta = { 
  primario: string; 
  secundario: string; 
  fondo: string; 
  texto: string; 
}; 
 
export function extractPaletaFromImage(imageUrl: string): Promise<ExtractedPaleta> { 
  return new Promise((resolve, reject) => { 
    const img = new Image(); 
    // Solo setear crossOrigin para URLs externas, no para blob: URLs locales 
    if (!imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) { 
      img.crossOrigin = "anonymous"; 
    } 
    img.onload = () => { 
      try { 
        const data = getImageData(img); 
        const colors = quantizeColors(data); 
 
        const dark = colors.find(isDark) ?? { r: 15, g: 22, b: 35 }; 
        const light = colors.find(isLight) ?? { r: 240, g: 241, b: 245 }; 
        const accent = colors.find( 
          (c) => !isDark(c) && !isLight(c) && luminance(c) > 80 
        ) ?? { r: 124, g: 131, b: 255 }; 
        const secondary = colors.find( 
          (c) => c !== accent && !isDark(c) && !isLight(c) 
        ) ?? accent; 
 
        resolve({ 
          fondo: rgbToHex(dark), 
          texto: rgbToHex(light), 
          primario: rgbToHex(accent), 
          secundario: rgbToHex(secondary), 
        }); 
      } catch (e) { 
        reject(e); 
      } 
    }; 
    img.onerror = reject; 
    img.src = imageUrl; 
  }); 
} 
