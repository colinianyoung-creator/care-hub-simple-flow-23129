-- Make diet_photos and money_receipts buckets public for proper image display
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('diet_photos', 'money_receipts');

-- Add RLS policies for diet_photos bucket
CREATE POLICY "Family members can view diet photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diet_photos' 
  AND EXISTS (
    SELECT 1 FROM public.diet_entries de
    JOIN public.user_memberships um ON um.family_id = de.family_id
    WHERE de.photo_url LIKE '%' || storage.objects.name
    AND um.user_id = auth.uid()
  )
);

CREATE POLICY "Family members can upload diet photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diet_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authors and admins can delete diet photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diet_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add RLS policies for money_receipts bucket
CREATE POLICY "Family members can view money receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'money_receipts'
  AND EXISTS (
    SELECT 1 FROM public.money_entries me
    JOIN public.user_memberships um ON um.family_id = me.family_id
    WHERE me.photo_url LIKE '%' || storage.objects.name
    AND um.user_id = auth.uid()
  )
);

CREATE POLICY "Family members can upload money receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'money_receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authors and admins can delete money receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'money_receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);