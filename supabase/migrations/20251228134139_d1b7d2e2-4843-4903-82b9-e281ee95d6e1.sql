-- Fix PUBLIC_DATA_EXPOSURE: Create a secure view for profile access
-- This restricts contact information to profile owners and family admins only

-- Create a secure function to check if user can see contact details
CREATE OR REPLACE FUNCTION public.can_view_contact_details(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner can always see their own contact details
  SELECT _viewer_id = _profile_id
  OR EXISTS (
    -- Family admins can see contact details of users in their families
    SELECT 1 FROM user_memberships um1
    JOIN user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = _viewer_id
      AND um2.user_id = _profile_id
      AND um1.role IN ('family_admin', 'disabled_person')
  );
$$;

-- Create a secure view that masks contact info for non-privileged users
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id,
  created_at,
  updated_at,
  ui_preference,
  two_factor_enabled,
  -- Only show contact fields if user is owner or family admin
  CASE WHEN can_view_contact_details(auth.uid(), id) THEN email ELSE NULL END AS email,
  full_name,
  CASE WHEN can_view_contact_details(auth.uid(), id) THEN phone ELSE NULL END AS phone,
  profile_picture_url,
  CASE WHEN can_view_contact_details(auth.uid(), id) THEN contact_email ELSE NULL END AS contact_email,
  CASE WHEN can_view_contact_details(auth.uid(), id) THEN contact_phone ELSE NULL END AS contact_phone,
  care_recipient_name
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_secure IS 'Secure view that masks contact information (email, phone, contact_email, contact_phone) for users who are not the profile owner or a family admin. Use this view instead of direct profiles table access to prevent PII exposure.';