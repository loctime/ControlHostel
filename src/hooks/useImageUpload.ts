"use client"; 
 
import { useState } from "react"; 
import { uploadToCloudinary, type CloudinaryUploadResult } from "@/lib/cloudinary"; 
 
export type UploadState = { 
  uploading: boolean; 
  error: string | null; 
}; 
 
export function useImageUpload(folder = "hostels") { 
  const [state, setState] = useState<UploadState>({ uploading: false, error: null }); 
 
  async function uploadOne(file: File): Promise<CloudinaryUploadResult> { 
    setState({ uploading: true, error: null }); 
    try { 
      const result = await uploadToCloudinary(file, folder); 
      setState({ uploading: false, error: null }); 
      return result; 
    } catch (e) { 
      const msg = e instanceof Error ? e.message : "Error subiendo imagen"; 
      setState({ uploading: false, error: msg }); 
      throw e; 
    } 
  } 
 
  async function uploadMany(files: File[]): Promise<CloudinaryUploadResult[]> { 
    setState({ uploading: true, error: null }); 
    try { 
      const results = await Promise.all(files.map((f) => uploadToCloudinary(f, folder))); 
      setState({ uploading: false, error: null }); 
      return results; 
    } catch (e) { 
      const msg = e instanceof Error ? e.message : "Error subiendo imágenes"; 
      setState({ uploading: false, error: msg }); 
      throw e; 
    } 
  } 
 
  return { ...state, uploadOne, uploadMany }; 
} 
