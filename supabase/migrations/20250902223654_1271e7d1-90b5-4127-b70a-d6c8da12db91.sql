-- Fix remaining function security warnings

-- Update seed_sample_data function
CREATE OR REPLACE FUNCTION public.seed_sample_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update generate_shift_instances function
CREATE OR REPLACE FUNCTION public.generate_shift_instances(_assignment_id uuid, _start_date date, _end_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  assignment_record record;
  loop_date date;
  day_of_week integer;
BEGIN
  -- Get assignment details
  SELECT * INTO assignment_record
  FROM public.shift_assignments
  WHERE id = _assignment_id AND active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift assignment not found or inactive';
  END IF;
  
  loop_date := _start_date;
  
  WHILE loop_date <= _end_date LOOP
    day_of_week := EXTRACT(DOW FROM loop_date);
    
    -- Check if this day is in the assignment's days_of_week
    IF day_of_week = ANY(assignment_record.days_of_week) THEN
      INSERT INTO public.shift_instances (
        shift_assignment_id,
        family_id,
        carer_id,
        scheduled_date,
        start_time,
        end_time
      ) VALUES (
        assignment_record.id,
        assignment_record.family_id,
        assignment_record.carer_id,
        loop_date,
        assignment_record.start_time,
        assignment_record.end_time
      ) ON CONFLICT (shift_assignment_id, scheduled_date) DO NOTHING;
    END IF;
    
    loop_date := loop_date + interval '1 day';
  END LOOP;
END;
$function$;