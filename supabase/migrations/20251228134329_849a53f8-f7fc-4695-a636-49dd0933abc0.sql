-- Fix the SECURITY DEFINER view warning by recreating with SECURITY INVOKER
-- Drop and recreate the view with proper security settings

DROP VIEW IF EXISTS public.profiles_secure;

-- Recreate as SECURITY INVOKER (default, explicitly set for clarity)
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
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