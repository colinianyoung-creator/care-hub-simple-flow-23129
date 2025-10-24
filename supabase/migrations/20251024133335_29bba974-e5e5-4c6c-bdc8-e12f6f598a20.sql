-- Fix 1: Restrict profile updates to only safe fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND id = id  -- Cannot change id
  AND email IS NOT DISTINCT FROM (SELECT email FROM public.profiles WHERE id = auth.uid())  -- Cannot change email
  AND created_at IS NOT DISTINCT FROM (SELECT created_at FROM public.profiles WHERE id = auth.uid())  -- Cannot change created_at
  AND updated_at >= (SELECT updated_at FROM public.profiles WHERE id = auth.uid())  -- Can only increase updated_at
);

-- Fix 2: Add storage RLS policies for profile_pictures bucket
-- Policy: Users can view their own profile pictures
CREATE POLICY "Users can view own profile pictures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile_pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Family members can view each other's profile pictures
CREATE POLICY "Family members can view profile pictures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid()
    AND um2.user_id = (storage.foldername(name))[1]::uuid
  )
);

-- Policy: Users can upload their own profile pictures
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own profile pictures
CREATE POLICY "Users can update own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);