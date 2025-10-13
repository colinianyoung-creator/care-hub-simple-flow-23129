import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to a Supabase storage bucket
 * @param bucket - The storage bucket name
 * @param file - The file to upload
 * @param userId - The user ID (used for folder structure)
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  file: File,
  userId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  return getPublicUrl(bucket, data.path);
}

/**
 * Get the public URL for a file in storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns The public URL
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Delete a file from storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  // Extract the path after the bucket URL
  const pathParts = path.split(`/${bucket}/`);
  const filePath = pathParts.length > 1 ? pathParts[1] : path;
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) throw error;
}

/**
 * Extract the file path from a full storage URL
 * @param url - The full storage URL
 * @param bucket - The bucket name
 * @returns The file path
 */
export function extractFilePath(url: string, bucket: string): string {
  const pathParts = url.split(`/${bucket}/`);
  return pathParts.length > 1 ? pathParts[1] : url;
}
