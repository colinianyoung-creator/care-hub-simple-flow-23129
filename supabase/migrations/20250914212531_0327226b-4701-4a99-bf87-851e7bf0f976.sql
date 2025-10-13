-- Create storage bucket for timesheet signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('timesheet-signatures', 'timesheet-signatures', false);

-- Create policies for signature uploads
CREATE POLICY "Users can upload their family signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'timesheet-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] IN ('employer', 'employee')
);

CREATE POLICY "Users can view their family signatures" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'timesheet-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their family signatures" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'timesheet-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their family signatures" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'timesheet-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);