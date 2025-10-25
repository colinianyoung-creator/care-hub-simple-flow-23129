-- Drop and recreate get_profile_safe function to use ui_preference instead of preferred_role
DROP FUNCTION IF EXISTS public.get_profile_safe();

CREATE FUNCTION public.get_profile_safe()
RETURNS TABLE(
  id uuid, 
  email text, 
  full_name text, 
  phone text, 
  profile_picture_url text,
  contact_email text,
  contact_phone text,
  care_recipient_name text,
  ui_preference app_role
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id, 
    email, 
    full_name, 
    phone, 
    profile_picture_url,
    contact_email,
    contact_phone,
    care_recipient_name,
    ui_preference
  FROM public.profiles
  WHERE id = auth.uid();
$$;