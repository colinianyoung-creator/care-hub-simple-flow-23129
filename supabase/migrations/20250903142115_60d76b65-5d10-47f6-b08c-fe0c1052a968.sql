-- Add disabled_person_id linkages to restore data connections after security updates
-- This ensures all carers and family members are linked to their Disabled Person

-- 1. Add disabled_person_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN disabled_person_id uuid REFERENCES public.profiles(id);

-- 2. Add disabled_person_id to shift-related tables
ALTER TABLE public.shift_assignments 
ADD COLUMN disabled_person_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.shift_instances 
ADD COLUMN disabled_person_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.time_entries 
ADD COLUMN disabled_person_id uuid REFERENCES public.profiles(id);

-- 3. Create helper function to get disabled person ID for a family
CREATE OR REPLACE FUNCTION public.get_family_disabled_person_id(_family_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  JOIN public.user_memberships um ON p.id = um.user_id
  WHERE um.family_id = _family_id 
    AND um.role = 'disabled_person'
  LIMIT 1;
$$;

-- 4. Backfill existing data with disabled_person_id
-- Update profiles for family members
UPDATE public.profiles 
SET disabled_person_id = subquery.disabled_person_id
FROM (
  SELECT p.id as profile_id, get_family_disabled_person_id(um.family_id) as disabled_person_id
  FROM public.profiles p
  JOIN public.user_memberships um ON p.id = um.user_id
  WHERE um.role != 'disabled_person'
) as subquery
WHERE profiles.id = subquery.profile_id;

-- Update shift assignments
UPDATE public.shift_assignments 
SET disabled_person_id = get_family_disabled_person_id(family_id)
WHERE disabled_person_id IS NULL;

-- Update shift instances
UPDATE public.shift_instances 
SET disabled_person_id = get_family_disabled_person_id(family_id)
WHERE disabled_person_id IS NULL;

-- Update time entries
UPDATE public.time_entries 
SET disabled_person_id = get_family_disabled_person_id(family_id)
WHERE disabled_person_id IS NULL;

-- 5. Create trigger to auto-assign disabled_person_id for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_profile_disabled_person_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family_id uuid;
  _disabled_person_id uuid;
BEGIN
  -- Get the family_id for this user
  SELECT um.family_id INTO _family_id
  FROM public.user_memberships um 
  WHERE um.user_id = NEW.id 
  LIMIT 1;

  -- If user is not disabled_person, link to family's disabled person
  IF _family_id IS NOT NULL THEN
    SELECT get_family_disabled_person_id(_family_id) INTO _disabled_person_id;
    
    -- Only update if user is not the disabled person themselves
    IF _disabled_person_id IS NOT NULL AND _disabled_person_id != NEW.id THEN
      NEW.disabled_person_id = _disabled_person_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_profile_disabled_person_link
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_disabled_person_link();

-- 6. Update generate_shift_instances function to include disabled_person_id
CREATE OR REPLACE FUNCTION public.generate_shift_instances(_assignment_id uuid, _start_date date, _end_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        disabled_person_id,
        scheduled_date,
        start_time,
        end_time
      ) VALUES (
        assignment_record.id,
        assignment_record.family_id,
        assignment_record.carer_id,
        assignment_record.disabled_person_id,
        loop_date,
        assignment_record.start_time,
        assignment_record.end_time
      ) ON CONFLICT (shift_assignment_id, scheduled_date) DO NOTHING;
    END IF;
    
    loop_date := loop_date + interval '1 day';
  END LOOP;
END;
$$;

-- 7. Update redeem_invite function to auto-assign disabled_person_id
CREATE OR REPLACE FUNCTION public.redeem_invite(_invite_code text, _user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _family_id uuid;
  _disabled_person_id uuid;
BEGIN
  -- Find and validate invite
  SELECT * INTO _invite
  FROM public.invites
  WHERE invite_code = _invite_code
    AND redeemed_by IS NULL
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  _family_id := _invite.family_id;
  
  -- Check if user is already a member
  IF is_member(_user_id, _family_id) THEN
    RAISE EXCEPTION 'User is already a member of this family';
  END IF;
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _family_id, _invite.invited_role);
  
  -- Get the disabled person ID for this family
  SELECT get_family_disabled_person_id(_family_id) INTO _disabled_person_id;
  
  -- Update or create profile with disabled_person_id linkage
  -- Only if the new user is not the disabled person themselves
  IF _disabled_person_id IS NOT NULL AND _disabled_person_id != _user_id THEN
    INSERT INTO public.profiles (id, disabled_person_id)
    VALUES (_user_id, _disabled_person_id)
    ON CONFLICT (id) DO UPDATE SET
      disabled_person_id = _disabled_person_id;
  END IF;
  
  -- Mark invite as redeemed
  UPDATE public.invites
  SET redeemed_by = _user_id, redeemed_at = now()
  WHERE id = _invite.id;
  
  RETURN _family_id;
END;
$$;

-- 8. Add DELETE policy for invites (mentioned as missing feature)
CREATE POLICY "Admins can delete invites" 
ON public.invites 
FOR DELETE 
TO authenticated
USING (has_family_role(auth.uid(), family_id, 'disabled_person'::app_role) OR 
       has_family_role(auth.uid(), family_id, 'family_admin'::app_role));

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_disabled_person_id ON public.profiles(disabled_person_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_disabled_person_id ON public.shift_assignments(disabled_person_id);
CREATE INDEX IF NOT EXISTS idx_shift_instances_disabled_person_id ON public.shift_instances(disabled_person_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_disabled_person_id ON public.time_entries(disabled_person_id);

-- 10. Add comments for documentation
COMMENT ON COLUMN public.profiles.disabled_person_id IS 'Links carers and family members to their assigned disabled person';
COMMENT ON COLUMN public.shift_assignments.disabled_person_id IS 'Identifies which disabled person this shift assignment serves';
COMMENT ON COLUMN public.shift_instances.disabled_person_id IS 'Identifies which disabled person this shift instance serves';
COMMENT ON COLUMN public.time_entries.disabled_person_id IS 'Identifies which disabled person this time entry is for';