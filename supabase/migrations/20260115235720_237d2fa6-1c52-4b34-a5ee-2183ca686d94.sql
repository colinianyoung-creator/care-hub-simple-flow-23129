-- Fix chat-attachments bucket security
-- 1. Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

-- 3. Create proper SELECT policy that restricts access to:
--    a) Users who uploaded the file (owner)
--    b) Users who are participants in conversations where the file was shared
CREATE POLICY "Users can view their own or shared chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (
    -- User owns the file (uploaded it)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is a participant in a conversation where this attachment was shared
    EXISTS (
      SELECT 1 
      FROM public.messages m
      JOIN public.conversation_participants cp 
        ON cp.conversation_id = m.conversation_id
      WHERE m.attachment_url LIKE '%' || storage.filename(name)
        AND cp.user_id = auth.uid()
    )
  )
);