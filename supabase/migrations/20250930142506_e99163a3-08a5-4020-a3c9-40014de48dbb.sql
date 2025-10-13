-- Remove the security definer view and use RLS-based approach instead
DROP VIEW IF EXISTS public.profiles_safe;

-- The get_profile_safe function already handles field-level access control properly
-- All application code should use this function instead of direct table access

-- Add a helpful comment to the profiles table
COMMENT ON TABLE public.profiles IS 'User profile information. Contains sensitive contact data (contact_email, contact_phone) that should only be accessed via get_profile_safe() function to ensure proper field-level security. Direct SELECT queries will return data per RLS but without masking sensitive fields.';