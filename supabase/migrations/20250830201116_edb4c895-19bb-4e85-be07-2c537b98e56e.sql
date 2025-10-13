-- Update RLS policies for role-based access control

-- Update shift_instances policies
DROP POLICY IF EXISTS "Family members can view shift instances" ON public.shift_instances;
DROP POLICY IF EXISTS "Carers can confirm their own shifts" ON public.shift_instances;
DROP POLICY IF EXISTS "Admins can manage shift instances" ON public.shift_instances;

CREATE POLICY "Family members can view shift instances" 
ON public.shift_instances 
FOR SELECT 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR 
    has_family_role(auth.uid(), family_id, 'family_viewer') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND carer_id = auth.uid())
  )
);

CREATE POLICY "Carers can update their own shift instances" 
ON public.shift_instances 
FOR UPDATE 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND carer_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage shift instances" 
ON public.shift_instances 
FOR ALL 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
)
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

-- Update time_entries policies
DROP POLICY IF EXISTS "Family members can view time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users and admins can update time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users and admins can delete time entries" ON public.time_entries;

CREATE POLICY "Family members can view time entries" 
ON public.time_entries 
FOR SELECT 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR 
    has_family_role(auth.uid(), family_id, 'family_viewer') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND user_id = auth.uid())
  )
);

CREATE POLICY "Users can create their own time entries" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (
  is_member(auth.uid(), family_id) AND user_id = auth.uid()
);

CREATE POLICY "Users and admins can update time entries" 
ON public.time_entries 
FOR UPDATE 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND user_id = auth.uid())
  )
);

CREATE POLICY "Users and admins can delete time entries" 
ON public.time_entries 
FOR DELETE 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND user_id = auth.uid())
  )
);

-- Update shift_requests policies
DROP POLICY IF EXISTS "Family members can view shift requests" ON public.shift_requests;
DROP POLICY IF EXISTS "Family members can create shift requests" ON public.shift_requests;
DROP POLICY IF EXISTS "Requesters and admins can update shift requests" ON public.shift_requests;

CREATE POLICY "Family members can view shift requests" 
ON public.shift_requests 
FOR SELECT 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR 
    has_family_role(auth.uid(), family_id, 'family_viewer') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND requester_id = auth.uid())
  )
);

CREATE POLICY "Carers can create their own shift requests" 
ON public.shift_requests 
FOR INSERT 
WITH CHECK (
  is_member(auth.uid(), family_id) AND requester_id = auth.uid()
);

CREATE POLICY "Requesters and admins can update shift requests" 
ON public.shift_requests 
FOR UPDATE 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND requester_id = auth.uid())
  )
);

-- Add care_recipient_id to profiles table for disabled person linking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS care_recipient_id uuid;

-- Update shift_assignments policies for carer selection
DROP POLICY IF EXISTS "Family members can view shift assignments" ON public.shift_assignments;
DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;

CREATE POLICY "Family members can view shift assignments" 
ON public.shift_assignments 
FOR SELECT 
USING (
  is_member(auth.uid(), family_id) AND (
    has_family_role(auth.uid(), family_id, 'family_admin') OR 
    has_family_role(auth.uid(), family_id, 'disabled_person') OR 
    has_family_role(auth.uid(), family_id, 'family_viewer') OR
    (has_family_role(auth.uid(), family_id, 'carer') AND carer_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage shift assignments" 
ON public.shift_assignments 
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