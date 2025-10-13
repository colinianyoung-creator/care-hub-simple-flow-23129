-- Fix missing RLS policies for tables with RLS enabled but no policies

-- Enable RLS and add policies for care_plans table
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view care plans" 
ON public.care_plans 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage care plans" 
ON public.care_plans 
FOR ALL 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
)
WITH CHECK (
  (has_family_role(auth.uid(), family_id, 'family_admin') OR 
   has_family_role(auth.uid(), family_id, 'disabled_person')) AND 
  created_by = auth.uid()
);

-- Enable RLS and add policies for care_recipients table
ALTER TABLE public.care_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view care recipients" 
ON public.care_recipients 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage care recipients" 
ON public.care_recipients 
FOR ALL 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
)
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

-- Enable RLS and add policies for tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view tasks" 
ON public.tasks 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Creators and admins can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  (created_by = auth.uid()) OR 
  (assigned_to = auth.uid()) OR
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);

CREATE POLICY "Creators and admins can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  (created_by = auth.uid()) OR 
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);

-- Enable RLS and add policies for time_entries table
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view time entries" 
ON public.time_entries 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Users can create their own time entries" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND user_id = auth.uid());

CREATE POLICY "Users and admins can update time entries" 
ON public.time_entries 
FOR UPDATE 
USING (
  (user_id = auth.uid()) OR 
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);

CREATE POLICY "Users and admins can delete time entries" 
ON public.time_entries 
FOR DELETE 
USING (
  (user_id = auth.uid()) OR 
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);