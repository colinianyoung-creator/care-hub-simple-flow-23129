-- Fix handle_family_created to always assign family_admin role to creator
-- This prevents the bug where users sign up as family_admin but get added as carer

CREATE OR REPLACE FUNCTION public.handle_family_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always add the creator as family_admin, regardless of their default_role
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (NEW.created_by, NEW.id, 'family_admin'::app_role)
  ON CONFLICT (user_id, family_id) DO NOTHING;

  RETURN NEW;
END;
$function$;