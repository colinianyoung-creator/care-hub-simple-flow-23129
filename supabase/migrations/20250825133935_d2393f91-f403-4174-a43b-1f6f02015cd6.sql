-- Fix user_memberships INSERT policy to allow family creators to self-assign as admin
DROP POLICY IF EXISTS "Memberships: admin can insert" ON public.user_memberships;

-- Create a policy that allows:
-- - Existing family admins to insert memberships
-- - Family creators to insert their own membership as family_admin
CREATE POLICY "Memberships: admin or creator can insert"
ON public.user_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'family_admin'::app_role)
  OR (
    EXISTS (
      SELECT 1
      FROM public.families f
      WHERE f.id = user_memberships.family_id
        AND f.created_by = auth.uid()
    )
    AND user_id = auth.uid()
    AND role = 'family_admin'::app_role
  )
);