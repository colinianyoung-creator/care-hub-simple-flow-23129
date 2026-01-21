-- Fix profiles_limited view to use security_definer pattern
-- This allows family members to see each other's basic profile info
DROP VIEW IF EXISTS public.profiles_limited;

CREATE VIEW public.profiles_limited 
WITH (security_barrier = true)
AS SELECT 
  p.id,
  p.full_name,
  p.profile_picture_url
FROM public.profiles p
WHERE (
  p.id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid() AND um2.user_id = p.id
  )
);

-- Set owner to postgres so view runs with elevated privileges
ALTER VIEW public.profiles_limited OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_limited TO authenticated;

-- Add is_archived column to risk_assessments for archive functionality
ALTER TABLE public.risk_assessments 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;