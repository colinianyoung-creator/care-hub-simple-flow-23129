-- Drop the previous view
DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate the view with SECURITY INVOKER to use the permissions of the querying user
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.care_recipient_name,
  p.profile_picture_url,
  p.created_at,
  -- Only show contact info if viewing own profile or if family admin viewing family member
  CASE 
    WHEN p.id = auth.uid() THEN p.contact_email
    WHEN public.can_view_full_contact(auth.uid(), p.id) THEN p.contact_email
    ELSE NULL
  END as contact_email,
  CASE 
    WHEN p.id = auth.uid() THEN p.contact_phone
    WHEN public.can_view_full_contact(auth.uid(), p.id) THEN p.contact_phone
    ELSE NULL
  END as contact_phone,
  p.disabled_person_id,
  p.care_recipient_id
FROM public.profiles p
WHERE p.id = auth.uid() OR public.users_in_same_family(auth.uid(), p.id);

-- Grant appropriate permissions on the view
GRANT SELECT ON public.profiles_safe TO authenticated;

COMMENT ON VIEW public.profiles_safe IS 'Secure view of profiles table that automatically masks contact information based on viewer permissions. Use this view instead of direct queries to profiles table for enhanced security. Uses SECURITY INVOKER to enforce RLS policies.';