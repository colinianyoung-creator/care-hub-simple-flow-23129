-- Replace handle_new_user with correct role-based logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  
  -- Insert/update profile with ui_preference
  INSERT INTO public.profiles (id, email, full_name, care_recipient_name, ui_preference)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'care_recipient_name',
    _user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    care_recipient_name = COALESCE(EXCLUDED.care_recipient_name, profiles.care_recipient_name),
    ui_preference = COALESCE(EXCLUDED.ui_preference, profiles.ui_preference);
  
  -- Create family for admin roles
  IF _user_role IN ('family_admin', 'disabled_person') 
     AND NOT EXISTS (SELECT 1 FROM public.user_memberships WHERE user_id = NEW.id) 
  THEN
    _first_name := SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), ' ', 1);
    
    INSERT INTO public.families (name, created_by)
    VALUES (
      _first_name || '''s Care Space',
      NEW.id
    )
    RETURNING id INTO _family_id;
    
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (NEW.id, _family_id, _user_role);
    
    RAISE NOTICE 'Created family % for user % with role %', _family_id, NEW.id, _user_role;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix existing broken account (nthankyou265@gmail.com / user_id: 8cde25fd-38fa-442d-9285-61538f2cc5f8)
DO $$
DECLARE
  _family_id uuid;
  _user_id uuid := '8cde25fd-38fa-442d-9285-61538f2cc5f8';
BEGIN
  -- Update profile to family_admin
  UPDATE profiles 
  SET ui_preference = 'family_admin'
  WHERE id = _user_id;
  
  -- Check if family already exists for this user
  IF NOT EXISTS (SELECT 1 FROM user_memberships WHERE user_id = _user_id) THEN
    -- Create family
    INSERT INTO families (name, created_by)
    VALUES ('Adolf''s Care Space', _user_id)
    RETURNING id INTO _family_id;
    
    -- Create membership
    INSERT INTO user_memberships (user_id, family_id, role)
    VALUES (_user_id, _family_id, 'family_admin');
    
    RAISE NOTICE 'Fixed existing account: created family % for user %', _family_id, _user_id;
  END IF;
END $$;