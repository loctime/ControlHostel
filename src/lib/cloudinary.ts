export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_NAME!; 
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!; 
 
export type CloudinaryUploadResult = { 
  public_id: string; 
  secure_url: string; 
  width: number; 
  height: number; 
  format: string; 
}; 
 
/** 
 * Sube un archivo de imagen a Cloudinary usando unsigned upload. 
 * Funciona desde el browser directamente, sin pasar por el servidor. 
 */ 
export async function uploadToCloudinary( 
  file: File, 
  folder = "hostels", 
): Promise<CloudinaryUploadResult> { 
  const formData = new FormData(); 
  formData.append("file", file); 
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); 
  formData.append("folder", folder); 
 
  const res = await fetch( 
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, 
    { method: "POST", body: formData }, 
  ); 
 
  if (!res.ok) { 
    const err = await res.json().catch(() => ({})); 
    throw new Error((err as { error?: { message?: string } }).error?.message ?? "Error subiendo imagen"); 
  } 
 
  return res.json() as Promise<CloudinaryUploadResult>; 
} 
