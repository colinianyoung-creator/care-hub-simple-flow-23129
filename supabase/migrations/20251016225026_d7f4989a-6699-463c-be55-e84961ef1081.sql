-- Add created_by column to families table
ALTER TABLE public.families
ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN contact_email text,
ADD COLUMN contact_phone text,
ADD COLUMN care_recipient_name text;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_pictures', 'profile_pictures', true);

-- RLS policies for profile_pictures bucket
CREATE POLICY "Users can view all profile pictures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile_pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile_pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile_pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile_pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RPC function for updating own role safely
CREATE OR REPLACE FUNCTION public.update_own_role_safe(
  _family_id uuid,
  _new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is member of the family
  IF NOT is_family_member(_user_id, _family_id) THEN
    RAISE EXCEPTION 'User is not a member of this family';
  END IF;
  
  -- Update the user's role
  UPDATE public.user_memberships
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id AND family_id = _family_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
END;
$$;