-- Create a secure view function for profiles that masks sensitive data
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_user_id uuid)
RETURNS TABLE (
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
BEGIN
  -- If requesting own profile, return full data
  IF profile_user_id = auth.uid() THEN
    RETURN QUERY 
    SELECT p.id, p.full_name, p.contact_email, p.contact_phone, 
           p.care_recipient_name, p.default_role, p.created_at
    FROM profiles p 
    WHERE p.id = profile_user_id;
  ELSE
    -- If family admin viewing other profiles, mask sensitive data
    IF EXISTS (
      SELECT 1 FROM user_memberships um1
      JOIN user_memberships um2 ON um1.family_id = um2.family_id
      WHERE um1.user_id = auth.uid() 
        AND um2.user_id = profile_user_id
        AND (um1.role = 'family_admin' OR um1.role = 'disabled_person')
    ) THEN
      RETURN QUERY 
      SELECT p.id, p.full_name, 
             CASE 
               WHEN p.contact_email IS NOT NULL 
               THEN CONCAT(LEFT(p.contact_email, 3), '***@', SPLIT_PART(p.contact_email, '@', 2))
               ELSE NULL 
             END as contact_email,
             CASE 
               WHEN p.contact_phone IS NOT NULL 
               THEN CONCAT('***-***-', RIGHT(p.contact_phone, 4))
               ELSE NULL 
             END as contact_phone,
             p.care_recipient_name, p.default_role, p.created_at
      FROM profiles p 
      WHERE p.id = profile_user_id;
    END IF;
  END IF;
END;
$$;

-- Update RLS policies to be more restrictive for direct table access
DROP POLICY IF EXISTS "Family admins can view family member profiles" ON public.profiles;

-- Create more restrictive policy that only allows viewing own profile directly
-- Family admins should use the safe function for viewing other profiles
CREATE POLICY "Restrict direct profile access" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Allow inserts/updates only for own profile
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- Add audit logging for profile access
CREATE TABLE IF NOT EXISTS public.profile_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by uuid NOT NULL,
  profile_accessed uuid NOT NULL,
  access_type text NOT NULL,
  accessed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs" 
ON public.profile_access_logs 
FOR SELECT 
USING (accessed_by = auth.uid() OR profile_accessed = auth.uid());

-- Function to log profile access
CREATE OR REPLACE FUNCTION public.log_profile_access(profile_id uuid, access_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profile_access_logs (accessed_by, profile_accessed, access_type)
  VALUES (auth.uid(), profile_id, access_type);
END;
$$;