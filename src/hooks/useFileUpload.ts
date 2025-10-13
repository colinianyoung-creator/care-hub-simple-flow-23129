import { useState } from 'react';
import { uploadFile, deleteFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface UseFileUploadReturn {
  upload: (file: File, userId: string) => Promise<string | null>;
  remove: (fileUrl: string) => Promise<void>;
  uploading: boolean;
  progress: number;
}

/**
 * Custom hook for managing file uploads to Supabase Storage
 * @param bucket - The storage bucket name
 * @returns Upload utilities and state
 */
export function useFileUpload(bucket: string): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const upload = async (file: File, userId: string): Promise<string | null> => {
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      });
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive"
      });
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress (since Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const url = await uploadFile(bucket, file, userId);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded"
      });

      return url;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const remove = async (fileUrl: string): Promise<void> => {
    try {
      await deleteFile(bucket, fileUrl);
      toast({
        title: "File deleted",
        description: "Your file has been removed"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  return { upload, remove, uploading, progress };
}
