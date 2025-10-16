-- Drop and recreate get_profile_safe function with new columns
DROP FUNCTION IF EXISTS public.get_profile_safe();

CREATE OR REPLACE FUNCTION public.get_profile_safe()
RETURNS TABLE(
  id uuid, 
  email text, 
  full_name text, 
  phone text, 
  profile_picture_url text,
  contact_email text,
  contact_phone text,
  care_recipient_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    id, 
    email, 
    full_name, 
    phone, 
    profile_picture_url,
    contact_email,
    contact_phone,
    care_recipient_name
  FROM public.profiles
  WHERE id = auth.uid();
$$;