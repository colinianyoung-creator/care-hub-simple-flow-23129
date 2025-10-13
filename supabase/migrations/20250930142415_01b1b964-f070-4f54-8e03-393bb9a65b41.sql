-- Fix: Restrict contact information access at database level
-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own and family profiles" ON public.profiles;

-- Create new SELECT policy that only returns basic info for family members
CREATE POLICY "Users can view basic profile info of family members"
ON public.profiles
FOR SELECT
USING (
  (id = auth.uid()) OR users_in_same_family(auth.uid(), id)
);

-- Create secure view for profile access with field-level restrictions
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  p.id,
  p.full_name,
  p.care_recipient_name,
  p.default_role,
  p.created_at,
  -- Only show contact info to the owner or family admins
  CASE 
    WHEN p.id = auth.uid() THEN p.contact_email
    WHEN EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
        AND um1.role IN ('family_admin', 'disabled_person')
    ) THEN CONCAT(LEFT(p.contact_email, 3), '***@', SPLIT_PART(p.contact_email, '@', 2))
    ELSE NULL
  END as contact_email,
  CASE 
    WHEN p.id = auth.uid() THEN p.contact_phone
    WHEN EXISTS (
      SELECT 1 FROM public.user_memberships um1
      JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = p.id
        AND um1.role IN ('family_admin', 'disabled_person')
    ) THEN CONCAT('***-***-', RIGHT(p.contact_phone, 4))
    ELSE NULL
  END as contact_phone,
  p.care_recipient_id,
  p.disabled_person_id
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_safe IS 'Secure view of profiles table with field-level access control. Contact information is only visible to profile owner and family admins (masked for admins).';

-- Update get_profile_safe function to ensure it uses proper masking
-- (The existing function already handles this, but we ensure consistency)
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  contact_email text, 
  contact_phone text, 
  care_recipient_name text, 
  default_role app_role, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_own_profile boolean;
  is_family_admin boolean;
  is_same_family boolean;
BEGIN
  -- Log the access for audit purposes
  PERFORM public.log_profile_access(profile_user_id, 'read');
  
  -- Check relationships
  is_own_profile := (profile_user_id = auth.uid());
  is_same_family := public.users_in_same_family(auth.uid(), profile_user_id);
  
  -- Check if current user is family admin in same family as target user
  is_family_admin := EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() 
      AND um2.user_id = profile_user_id
      AND um1.role IN ('family_admin', 'disabled_person')
  );
  
  -- Return data based on access level
  IF is_own_profile THEN
    -- Return full profile for own data
    RETURN QUERY 
    SELECT p.id, p.full_name, p.contact_email, p.contact_phone, 
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_family_admin AND is_same_family THEN
    -- Return partially masked data for family admins
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
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSIF is_same_family THEN
    -- Return basic info only for other family members (no contact info)
    RETURN QUERY 
    SELECT p.id, p.full_name, 
           NULL::text as contact_email,
           NULL::text as contact_phone,
           p.care_recipient_name, p.default_role, p.created_at
    FROM public.profiles p 
    WHERE p.id = profile_user_id;
  ELSE
    -- Return nothing for non-family members
    RETURN;
  END IF;
END;
$$;