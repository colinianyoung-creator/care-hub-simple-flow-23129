-- Part 1: Update profiles table SELECT policy for relational access
-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

-- Create new policy with self + relational access
CREATE POLICY "Users can view related profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id  -- Self access
  OR 
  public.users_in_same_family(auth.uid(), id)  -- Relational access via shared family
);

-- Part 2: Recreate profiles_limited view with security_invoker=on
DROP VIEW IF EXISTS public.profiles_limited;

CREATE VIEW public.profiles_limited
WITH (security_barrier=true, security_invoker=on) AS
SELECT 
  p.id,
  p.full_name,
  p.profile_picture_url
FROM public.profiles p
WHERE 
  p.id = auth.uid() 
  OR 
  public.users_in_same_family(auth.uid(), p.id);