-- Drop existing broad policy
DROP POLICY IF EXISTS "Family members can manage tasks" ON public.tasks;

-- Create granular policies for better control
CREATE POLICY "Family members can view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create their own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  is_family_member(auth.uid(), family_id) 
  AND created_by = auth.uid()
);

CREATE POLICY "Creators can update their tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  is_family_member(auth.uid(), family_id) 
  AND created_by = auth.uid()
)
WITH CHECK (
  is_family_member(auth.uid(), family_id) 
  AND created_by = auth.uid()
);

CREATE POLICY "Assigned users can mark tasks complete"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  is_family_member(auth.uid(), family_id) 
  AND assigned_to = auth.uid()
)
WITH CHECK (
  is_family_member(auth.uid(), family_id) 
  AND assigned_to = auth.uid()
);

CREATE POLICY "Admins can update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  can_manage_family(auth.uid(), family_id)
)
WITH CHECK (
  can_manage_family(auth.uid(), family_id)
);

CREATE POLICY "Family members can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (is_family_member(auth.uid(), family_id));