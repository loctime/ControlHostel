"use client"; 
 
import { useRef } from "react"; 
import { useImageUpload } from "@/hooks/useImageUpload"; 
import type { CloudinaryUploadResult } from "@/lib/cloudinary"; 
 
type Props = { 
  onUploaded: (results: CloudinaryUploadResult[]) => void; 
  multiple?: boolean; 
  folder?: string; 
  label?: string; 
  disabled?: boolean; 
}; 
 
export function ImageUploadButton({ 
  onUploaded, 
  multiple = false, 
  folder = "hostels", 
  label, 
  disabled, 
}: Props) { 
  const inputRef = useRef<HTMLInputElement>(null); 
  const { uploading, error, uploadMany } = useImageUpload(folder); 
 
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) { 
    const files = Array.from(e.target.files ?? []); 
    if (files.length === 0) return; 
    try { 
      const results = await uploadMany(files); 
      onUploaded(results); 
    } catch { 
      // el error ya está en state 
    } finally { 
      // limpiar input para permitir subir el mismo archivo de nuevo 
      if (inputRef.current) inputRef.current.value = ""; 
    } 
  } 
 
  return ( 
    <div> 
      <input 
        ref={inputRef} 
        type="file" 
        accept="image/*" 
        multiple={multiple} 
        className="hidden" 
        onChange={(e) => void handleChange(e)} 
        disabled={disabled ?? uploading} 
      /> 
      <button 
        type="button" 
        onClick={() => inputRef.current?.click()} 
        disabled={disabled ?? uploading} 
        className=" 
          inline-flex items-center gap-2 rounded-xl border border-white/20 
          bg-white/10 px-4 py-2 text-sm font-medium text-white 
          transition hover:bg-white/20 disabled:opacity-50 
        " 
      > 
        {uploading ? ( 
          <> 
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> 
            Subiendo... 
          </> 
        ) : ( 
          <> 
            📷 {label ?? (multiple ? "Subir imágenes" : "Subir imagen")} 
          </> 
        )} 
      </button> 
      {error ? ( 
        <p className="mt-1 text-xs text-red-400">{error}</p> 
      ) : null} 
    </div> 
  ); 
} 
