-- Make profile_pictures bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'profile_pictures';

-- Create helper function to check if users are in same family
CREATE OR REPLACE FUNCTION public.users_in_same_family(_user1_id uuid, _user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_memberships um1
    JOIN user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = _user1_id 
      AND um2.user_id = _user2_id
  );
$$;

-- Allow users to view their own profile pictures
CREATE POLICY "Users can view own profile picture"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow family members to view each other's pictures
CREATE POLICY "Family members can view member pictures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile_pictures' AND
  public.users_in_same_family(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);