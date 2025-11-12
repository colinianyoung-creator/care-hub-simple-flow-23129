-- Fix handle_new_user_profile to use ui_preference instead of preferred_role
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_role app_role;
  _family_id uuid;
  _first_name text;
BEGIN
  -- Read selected role from signup metadata
  _user_role := COALESCE((NEW.raw_user_meta_data->>'selected_role')::app_role, 'carer'::app_role);
  
  -- Insert/update profile with ui_preference (not preferred_role)
  INSERT INTO public.profiles (id, full_name, care_recipient_name, ui_preference)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'care_recipient_name',
    _user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    care_recipient_name = COALESCE(EXCLUDED.care_recipient_name, profiles.care_recipient_name),
    ui_preference = COALESCE(EXCLUDED.ui_preference, profiles.ui_preference);
  
  -- Only create family for family_admin or disabled_person roles
  IF _user_role IN ('family_admin', 'disabled_person') 
     AND NOT EXISTS (SELECT 1 FROM public.user_memberships WHERE user_id = NEW.id) 
  THEN
    -- Extract first name from full name
    _first_name := SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), ' ', 1);
    
    -- Create personal family
    INSERT INTO public.families (name, created_by)
    VALUES (
      _first_name || '''s Care Space',
      NEW.id
    )
    RETURNING id INTO _family_id;
    
    -- Add user as member with their role
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (NEW.id, _family_id, _user_role);
    
    -- Log success
    RAISE NOTICE 'Created family % for user % with role %', _family_id, NEW.id, _user_role;
  END IF;
  
  RETURN NEW;
END;
$function$;