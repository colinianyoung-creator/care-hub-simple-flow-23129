-- Fix Storage RLS policies for timesheet-signatures bucket
-- Allow family members to manage signatures based on family structure

-- Create policies for timesheet-signatures bucket
CREATE POLICY "Family members can upload signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'timesheet-signatures' 
  AND is_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Family members can view signatures" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'timesheet-signatures' 
  AND is_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Family members can update signatures" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'timesheet-signatures' 
  AND is_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Family members can delete signatures" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'timesheet-signatures' 
  AND is_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Update timesheet-signatures bucket to be public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'timesheet-signatures';