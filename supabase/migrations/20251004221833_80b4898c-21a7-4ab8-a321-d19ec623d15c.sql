-- Ensure all users have family memberships
-- This migration fixes the issue where users without families can't change roles

-- Step 1: Create personal families for users without memberships
DO $$
DECLARE
  _user record;
  _family_id uuid;
BEGIN
  -- Find all users from profiles table who don't have any memberships
  FOR _user IN 
    SELECT p.id, p.full_name, p.care_recipient_name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_memberships um WHERE um.user_id = p.id
    )
  LOOP
    -- Create a personal family for this user
    INSERT INTO public.families (name, created_by)
    VALUES (
      COALESCE(_user.full_name, 'Personal') || '''s Network',
      _user.id
    )
    RETURNING id INTO _family_id;
    
    -- Add user to their personal family with carer role (default)
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (_user.id, _family_id, 'carer'::app_role);
    
    RAISE NOTICE 'Created personal family for user: %', _user.id;
  END LOOP;
END $$;

-- Step 2: Add RLS policies for profile_pictures storage bucket (if not exist)
-- Allow users to upload to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own profile pictures'
  ) THEN
    CREATE POLICY "Users can upload their own profile pictures"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profile_pictures' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow users to update their own profile pictures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own profile pictures'
  ) THEN
    CREATE POLICY "Users can update their own profile pictures"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'profile_pictures' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow users to delete their own profile pictures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own profile pictures'
  ) THEN
    CREATE POLICY "Users can delete their own profile pictures"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profile_pictures' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow everyone to view profile pictures (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Profile pictures are publicly viewable'
  ) THEN
    CREATE POLICY "Profile pictures are publicly viewable"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'profile_pictures');
  END IF;
END $$;