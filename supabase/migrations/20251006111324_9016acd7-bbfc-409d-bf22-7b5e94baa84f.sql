-- Phase 1: Cleanup duplicate families and fix triggers

-- Step 1: Remove duplicate user_memberships
DELETE FROM public.user_memberships a
USING public.user_memberships b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.family_id = b.family_id;

-- Step 2: Merge duplicate families
DO $$
DECLARE
  user_record RECORD;
  oldest_family_id uuid;
  duplicate_family_id uuid;
BEGIN
  FOR user_record IN 
    SELECT created_by, array_agg(id ORDER BY created_at) as family_ids
    FROM public.families
    GROUP BY created_by
    HAVING count(*) > 1
  LOOP
    oldest_family_id := user_record.family_ids[1];
    
    FOREACH duplicate_family_id IN ARRAY user_record.family_ids[2:]
    LOOP
      -- Delete duplicate memberships that would conflict
      DELETE FROM public.user_memberships 
      WHERE family_id = duplicate_family_id 
        AND user_id IN (
          SELECT user_id FROM public.user_memberships WHERE family_id = oldest_family_id
        );
      
      -- Migrate remaining memberships
      UPDATE public.user_memberships SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.care_recipients SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.care_notes SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.tasks SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.appointments SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.medications SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.medication_logs SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.shift_assignments SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.shift_instances SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.shift_requests SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.time_entries SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.diet_entries SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.money_entries SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.key_information SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.leave_requests SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.invites SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.role_change_requests SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.admin_change_requests SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      UPDATE public.network_delete_requests SET family_id = oldest_family_id WHERE family_id = duplicate_family_id;
      
      DELETE FROM public.families WHERE id = duplicate_family_id;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Fix trigger to prevent future duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_role app_role;
BEGIN
  _user_role := COALESCE((NEW.raw_user_meta_data->>'selected_role')::app_role, 'carer'::app_role);
  
  INSERT INTO public.profiles (id, full_name, care_recipient_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'care_recipient_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    care_recipient_name = COALESCE(EXCLUDED.care_recipient_name, profiles.care_recipient_name);
  
  IF NOT EXISTS (SELECT 1 FROM public.user_memberships WHERE user_id = NEW.id) THEN
    INSERT INTO public.families (name, created_by)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Personal') || '''s Network',
      NEW.id
    );
    
    INSERT INTO public.user_memberships (user_id, family_id, role)
    SELECT NEW.id, f.id, _user_role
    FROM public.families f
    WHERE f.created_by = NEW.id
    ORDER BY f.created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;