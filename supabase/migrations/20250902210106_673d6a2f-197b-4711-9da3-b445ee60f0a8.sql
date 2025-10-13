-- Secure medical information access - restrict care_plans and medications to authorized users only

-- First, update care_plans policies to be more restrictive
DROP POLICY IF EXISTS "Family members can view care plans" ON public.care_plans;

-- Only family admins, disabled persons, and assigned carers can view care plans
CREATE POLICY "Authorized users can view care plans" 
ON public.care_plans 
FOR SELECT 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person') OR
  has_family_role(auth.uid(), family_id, 'manager') OR
  -- Carers can only view if they are assigned to tasks/shifts for this care recipient
  (has_family_role(auth.uid(), family_id, 'carer') AND EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.family_id = care_plans.family_id 
    AND t.care_recipient_id = care_plans.care_recipient_id
    AND t.assigned_to = auth.uid()
    UNION
    SELECT 1 FROM shift_assignments sa
    WHERE sa.family_id = care_plans.family_id
    AND sa.carer_id = auth.uid()
    AND sa.active = true
  ))
);

-- Update medications policies to be more restrictive  
DROP POLICY IF EXISTS "Family members can view medications" ON public.medications;
DROP POLICY IF EXISTS "Family members can create medications" ON public.medications;

-- Only authorized users can view medications
CREATE POLICY "Authorized users can view medications" 
ON public.medications 
FOR SELECT 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person') OR
  has_family_role(auth.uid(), family_id, 'manager') OR
  -- Carers can only view if they are assigned to this family's care
  (has_family_role(auth.uid(), family_id, 'carer') AND EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.family_id = medications.family_id 
    AND t.care_recipient_id = medications.care_recipient_id
    AND t.assigned_to = auth.uid()
    UNION
    SELECT 1 FROM shift_assignments sa
    WHERE sa.family_id = medications.family_id
    AND sa.carer_id = auth.uid()
    AND sa.active = true
  ))
);

-- Only family admins, disabled persons, and managers can create medications
CREATE POLICY "Authorized admins can create medications" 
ON public.medications 
FOR INSERT 
WITH CHECK (
  (has_family_role(auth.uid(), family_id, 'family_admin') OR 
   has_family_role(auth.uid(), family_id, 'disabled_person') OR
   has_family_role(auth.uid(), family_id, 'manager')) AND 
  created_by = auth.uid()
);

-- Add audit logging for medical data access
CREATE TABLE IF NOT EXISTS public.medical_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by uuid NOT NULL,
  family_id uuid NOT NULL,
  care_recipient_id uuid,
  data_type text NOT NULL, -- 'care_plan', 'medication', 'medication_log'
  record_id uuid NOT NULL,
  access_type text NOT NULL, -- 'view', 'create', 'update', 'delete'
  accessed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.medical_access_logs ENABLE ROW LEVEL SECURITY;

-- Only family admins and the user themselves can view medical access logs
CREATE POLICY "Authorized users can view medical access logs" 
ON public.medical_access_logs 
FOR SELECT 
USING (
  accessed_by = auth.uid() OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

-- Function to log medical data access
CREATE OR REPLACE FUNCTION public.log_medical_access(
  p_family_id uuid, 
  p_care_recipient_id uuid, 
  p_data_type text, 
  p_record_id uuid, 
  p_access_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO medical_access_logs (
    accessed_by, 
    family_id, 
    care_recipient_id, 
    data_type, 
    record_id, 
    access_type
  )
  VALUES (
    auth.uid(), 
    p_family_id, 
    p_care_recipient_id, 
    p_data_type, 
    p_record_id, 
    p_access_type
  );
END;
$$;

-- Also update medication_logs to be more restrictive
DROP POLICY IF EXISTS "Family members can view medication logs" ON public.medication_logs;

CREATE POLICY "Authorized users can view medication logs" 
ON public.medication_logs 
FOR SELECT 
USING (
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person') OR
  has_family_role(auth.uid(), family_id, 'manager') OR
  given_by = auth.uid() OR
  -- Carers can view logs for medications they are responsible for
  (has_family_role(auth.uid(), family_id, 'carer') AND EXISTS (
    SELECT 1 FROM shift_assignments sa
    WHERE sa.family_id = medication_logs.family_id
    AND sa.carer_id = auth.uid()
    AND sa.active = true
  ))
);