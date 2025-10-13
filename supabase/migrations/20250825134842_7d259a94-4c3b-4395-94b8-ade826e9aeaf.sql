
-- Allow the family creator to SELECT their newly created family
-- This complements the existing "members can select" policy and unblocks the flow
CREATE POLICY "Families: creator can select own rows"
ON public.families
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
