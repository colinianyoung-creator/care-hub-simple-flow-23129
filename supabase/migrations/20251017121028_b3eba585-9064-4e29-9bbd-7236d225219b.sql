-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Family admins can insert memberships" ON public.user_memberships;

-- Create new policy that allows both admins and family creators
CREATE POLICY "Family admins or creators can insert memberships"
  ON public.user_memberships FOR INSERT
  WITH CHECK (
    -- Existing admins can add members
    public.is_family_admin(auth.uid(), family_id)
    OR
    -- Family creators can add themselves as first member
    (
      user_id = auth.uid() 
      AND EXISTS (
        SELECT 1 FROM public.families 
        WHERE id = family_id 
        AND created_by = auth.uid()
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_memberships 
        WHERE family_id = user_memberships.family_id
      )
    )
  );