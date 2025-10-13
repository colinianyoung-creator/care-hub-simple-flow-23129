-- Create storage bucket for timesheet templates
INSERT INTO storage.buckets (id, name, public) VALUES ('timesheet-templates', 'timesheet-templates', false);

-- Create policies for timesheet templates storage
CREATE POLICY "Admin family members can upload templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'timesheet-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM user_memberships um 
    WHERE um.user_id = auth.uid() 
    AND um.family_id::text = (storage.foldername(name))[2]
    AND um.role IN ('family_admin', 'disabled_person')
  )
);

CREATE POLICY "Admin family members can view templates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'timesheet-templates' 
  AND EXISTS (
    SELECT 1 FROM user_memberships um 
    WHERE um.user_id = auth.uid() 
    AND um.family_id::text = (storage.foldername(name))[2]
    AND um.role IN ('family_admin', 'disabled_person', 'family_viewer', 'carer')
  )
);

CREATE POLICY "Admin family members can delete templates" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'timesheet-templates' 
  AND EXISTS (
    SELECT 1 FROM user_memberships um 
    WHERE um.user_id = auth.uid() 
    AND um.family_id::text = (storage.foldername(name))[2]
    AND um.role IN ('family_admin', 'disabled_person')
  )
);