-- Create the missing update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Extend app_role enum with new roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'disabled_person';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'family_viewer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'carer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add default_role to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_role app_role DEFAULT 'carer';

-- Create care_plans table
CREATE TABLE IF NOT EXISTS public.care_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  care_recipient_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  goals text[],
  medications jsonb DEFAULT '[]',
  emergency_contacts jsonb DEFAULT '[]',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on care_plans
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

-- Care plans policies
DROP POLICY IF EXISTS "Care plans: members can select" ON public.care_plans;
CREATE POLICY "Care plans: members can select"
ON public.care_plans
FOR SELECT
TO authenticated
USING (is_member(auth.uid(), family_id));

DROP POLICY IF EXISTS "Care plans: family admin can insert" ON public.care_plans;
CREATE POLICY "Care plans: family admin can insert"
ON public.care_plans
FOR INSERT
TO authenticated
WITH CHECK (
  has_family_role(auth.uid(), family_id, 'family_admin') 
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Care plans: family admin can update" ON public.care_plans;
CREATE POLICY "Care plans: family admin can update"
ON public.care_plans
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'family_admin'));

DROP POLICY IF EXISTS "Care plans: family admin can delete" ON public.care_plans;
CREATE POLICY "Care plans: family admin can delete"
ON public.care_plans
FOR DELETE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'family_admin'));

-- Add approval system to time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'time_entries_status_check' 
        AND table_name = 'time_entries'
    ) THEN
        ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Update time_entries policies to include approval logic
DROP POLICY IF EXISTS "Time entries: owners or admin can update" ON public.time_entries;
DROP POLICY IF EXISTS "Time entries: owners can update pending entries" ON public.time_entries;
DROP POLICY IF EXISTS "Time entries: family admin can update all" ON public.time_entries;

CREATE POLICY "Time entries: owners can update pending entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND is_member(auth.uid(), family_id) 
  AND (status = 'pending' OR status IS NULL)
);

CREATE POLICY "Time entries: family admin can update all"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'family_admin'));

-- Create function to prevent non-admin users from approving their own entries
CREATE OR REPLACE FUNCTION public.validate_time_entry_approval()
RETURNS trigger AS $$
BEGIN
  -- If approval fields are being set, ensure user is family admin and not approving their own entry
  IF (NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.status IN ('approved', 'rejected')) THEN
    IF NOT has_family_role(auth.uid(), NEW.family_id, 'family_admin') THEN
      RAISE EXCEPTION 'Only family administrators can approve time entries';
    END IF;
    
    IF NEW.approved_by = NEW.user_id THEN
      RAISE EXCEPTION 'Users cannot approve their own time entries';
    END IF;
    
    -- Set approval timestamp if not already set
    IF NEW.status IN ('approved', 'rejected') AND NEW.approved_at IS NULL THEN
      NEW.approved_at = now();
    END IF;
    
    -- Set approved_by if not already set
    IF NEW.status IN ('approved', 'rejected') AND NEW.approved_by IS NULL THEN
      NEW.approved_by = auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for time entry approval validation
DROP TRIGGER IF EXISTS validate_time_entry_approval_trigger ON public.time_entries;
CREATE TRIGGER validate_time_entry_approval_trigger
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry_approval();

-- Create updated_at trigger for care_plans
DROP TRIGGER IF EXISTS update_care_plans_updated_at ON public.care_plans;
CREATE TRIGGER update_care_plans_updated_at
  BEFORE UPDATE ON public.care_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sample data seeding function
CREATE OR REPLACE FUNCTION public.seed_sample_data()
RETURNS void AS $$
DECLARE
  demo_family_id uuid;
  demo_recipient_id uuid;
  admin_user_id uuid;
  carer_user_id uuid;
  disabled_user_id uuid;
  viewer_user_id uuid;
  manager_user_id uuid;
  demo_care_plan_id uuid;
BEGIN
  -- Create demo family
  INSERT INTO public.families (id, name, created_by)
  VALUES (gen_random_uuid(), 'Demo Family - Smith Household', auth.uid())
  RETURNING id INTO demo_family_id;
  
  -- Create demo care recipient
  INSERT INTO public.care_recipients (id, family_id, name, notes)
  VALUES (gen_random_uuid(), demo_family_id, 'Eleanor Smith', 'Elderly woman with mobility issues, enjoys reading and gardening')
  RETURNING id INTO demo_recipient_id;
  
  -- Generate demo user IDs (these would be real user IDs in practice)
  admin_user_id := gen_random_uuid();
  carer_user_id := gen_random_uuid();
  disabled_user_id := gen_random_uuid();
  viewer_user_id := gen_random_uuid();
  manager_user_id := gen_random_uuid();
  
  -- Create demo user memberships
  INSERT INTO public.user_memberships (user_id, family_id, role) VALUES
  (admin_user_id, demo_family_id, 'family_admin'),
  (carer_user_id, demo_family_id, 'carer'),
  (disabled_user_id, demo_family_id, 'disabled_person'),
  (viewer_user_id, demo_family_id, 'family_viewer'),
  (manager_user_id, demo_family_id, 'manager');
  
  -- Create demo care plan
  INSERT INTO public.care_plans (id, family_id, care_recipient_id, title, description, goals, medications, emergency_contacts, created_by)
  VALUES (
    gen_random_uuid(),
    demo_family_id,
    demo_recipient_id,
    'Eleanor''s Daily Care Plan',
    'Comprehensive care plan for daily activities and medical needs',
    ARRAY['Maintain mobility through daily walks', 'Medication compliance', 'Social engagement'],
    '[{"name": "Lisinopril", "dosage": "10mg", "frequency": "Daily"}, {"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"}]'::jsonb,
    '[{"name": "Dr. James Wilson", "phone": "555-0123", "relationship": "Primary Care"}, {"name": "Sarah Smith", "phone": "555-0456", "relationship": "Daughter"}]'::jsonb,
    admin_user_id
  ) RETURNING id INTO demo_care_plan_id;
  
  -- Create demo time entries
  INSERT INTO public.time_entries (user_id, family_id, care_recipient_id, start_time, end_time, notes, status, approved_by, approved_at) VALUES
  (carer_user_id, demo_family_id, demo_recipient_id, now() - interval '2 days', now() - interval '2 days' + interval '8 hours', 'Morning care routine completed', 'approved', admin_user_id, now() - interval '1 day'),
  (carer_user_id, demo_family_id, demo_recipient_id, now() - interval '1 day', now() - interval '1 day' + interval '6 hours', 'Afternoon medication and walk', 'pending', null, null);
  
  -- Create demo care notes
  INSERT INTO public.care_notes (family_id, care_recipient_id, author_id, content) VALUES
  (demo_family_id, demo_recipient_id, carer_user_id, 'Eleanor had a good morning, took medications on time and enjoyed breakfast'),
  (demo_family_id, demo_recipient_id, disabled_user_id, 'Feeling well today, looking forward to the garden visit this afternoon'),
  (demo_family_id, demo_recipient_id, admin_user_id, 'Reviewing care plan with Dr. Wilson next week');
  
  -- Create demo tasks
  INSERT INTO public.tasks (family_id, care_recipient_id, title, description, created_by, assigned_to, due_date) VALUES
  (demo_family_id, demo_recipient_id, 'Weekly medication review', 'Check all medications and update dosages if needed', admin_user_id, carer_user_id, current_date + interval '3 days'),
  (demo_family_id, demo_recipient_id, 'Physical therapy session', 'Scheduled PT session with therapist', admin_user_id, carer_user_id, current_date + interval '1 day');
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;