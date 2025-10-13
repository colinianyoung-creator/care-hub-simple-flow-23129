-- Create secure RPC function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id uuid,
  user_full_name text DEFAULT '',
  user_default_role app_role DEFAULT 'carer'::app_role,
  user_care_recipient_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_profile profiles;
BEGIN
  -- Insert or update profile
  INSERT INTO public.profiles (id, full_name, default_role, care_recipient_name)
  VALUES (user_id, user_full_name, user_default_role, user_care_recipient_name)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    default_role = COALESCE(EXCLUDED.default_role, profiles.default_role),
    care_recipient_name = COALESCE(EXCLUDED.care_recipient_name, profiles.care_recipient_name)
  RETURNING * INTO result_profile;
  
  RETURN jsonb_build_object(
    'id', result_profile.id,
    'full_name', result_profile.full_name,
    'default_role', result_profile.default_role,
    'care_recipient_name', result_profile.care_recipient_name
  );
END;
$$;