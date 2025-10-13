-- Drop existing get_profile_safe function
DROP FUNCTION IF EXISTS public.get_profile_safe(uuid);

-- Recreate get_profile_safe function with profile_picture_url included
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  contact_email text, 
  contact_phone text, 
  care_recipient_name text, 
  profile_picture_url text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  is_own_profile boolean;
  is_family_admin boolean;
  is_same_family boolean;
BEGIN
  PERFORM public.log_profile_access(profile_user_id, 'read');
  
  is_own_profile := (profile_user_id = auth.uid());
  is_same_family := public.users_in_same_family(auth.uid(), profile_user_id);
  
  is_family_admin := EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = profile_user_id
      AND um1.role IN ('family_admin', 'disabled_person')
  );
  
  IF is_own_profile THEN
    RETURN QUERY 
    SELECT p.id, p.full_name, p.contact_email, p.contact_phone, 
           p.care_recipient_name, p.profile_picture_url, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_family_admin AND is_same_family THEN
    RETURN QUERY 
    SELECT p.id, p.full_name, 
           CASE 
             WHEN p.contact_email IS NOT NULL AND LENGTH(p.contact_email) > 3
             THEN CONCAT(LEFT(p.contact_email, 3), '***@', SPLIT_PART(p.contact_email, '@', 2))
             ELSE NULL 
           END as contact_email,
           CASE 
             WHEN p.contact_phone IS NOT NULL AND LENGTH(p.contact_phone) >= 4
             THEN CONCAT('***-***-', RIGHT(p.contact_phone, 4))
             ELSE NULL 
           END as contact_phone,
           p.care_recipient_name, p.profile_picture_url, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_same_family THEN
    RETURN QUERY 
    SELECT p.id, p.full_name, 
           NULL::text as contact_email,
           NULL::text as contact_phone,
           p.care_recipient_name, p.profile_picture_url, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSE
    RETURN;
  END IF;
END;
$function$;