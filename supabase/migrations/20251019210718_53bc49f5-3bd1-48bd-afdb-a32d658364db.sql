-- Create security definer function to validate family creation
CREATE OR REPLACE FUNCTION public.can_create_family(_user_id uuid, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL 
    AND _created_by IS NOT NULL 
    AND _user_id = _created_by;
$$;

-- Drop the current policy
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

-- Create the new policy using the security definer function
CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (
    public.can_create_family(auth.uid(), created_by)
  );