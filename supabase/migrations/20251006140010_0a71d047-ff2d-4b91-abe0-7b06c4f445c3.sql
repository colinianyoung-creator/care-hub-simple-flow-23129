-- Drop and recreate ensure_user_membership function without default_role reference
CREATE OR REPLACE FUNCTION public.ensure_user_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _personal_family_id uuid;
  _user_role app_role;
BEGIN
  -- Default new users to 'carer' role
  _user_role := 'carer'::app_role;
  
  -- Check if user already has any membership
  IF NOT EXISTS (
    SELECT 1 FROM public.user_memberships WHERE user_id = NEW.id
  ) THEN
    -- Create a personal family for this user
    INSERT INTO public.families (name, created_by)
    VALUES (
      COALESCE(NEW.full_name, 'Personal') || '''s Network',
      NEW.id
    )
    RETURNING id INTO _personal_family_id;
    
    -- Add user to their personal family with their role
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (NEW.id, _personal_family_id, _user_role);
  END IF;
  
  RETURN NEW;
END;
$function$;