-- Drop and recreate get_profile_safe with preferred_role in return type
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
  preferred_role app_role
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    id, 
    email, 
    full_name, 
    phone, 
    profile_picture_url,
    contact_email,
    contact_phone,
    care_recipient_name,
    preferred_role
  FROM public.profiles
  WHERE id = auth.uid();
$function$;