-- Create placeholder_carers table for unregistered carers
CREATE TABLE public.placeholder_carers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  linked_user_id UUID REFERENCES profiles(id),
  is_linked BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add placeholder_carer_id to shift_assignments
ALTER TABLE public.shift_assignments 
ADD COLUMN placeholder_carer_id UUID REFERENCES placeholder_carers(id);

-- Make carer_id nullable (either carer_id OR placeholder_carer_id can be set)
ALTER TABLE public.shift_assignments 
ALTER COLUMN carer_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.placeholder_carers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for placeholder_carers
CREATE POLICY "Family members can view placeholder carers" 
ON public.placeholder_carers 
FOR SELECT 
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can create placeholder carers" 
ON public.placeholder_carers 
FOR INSERT 
WITH CHECK (can_manage_family(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Family admins can update placeholder carers" 
ON public.placeholder_carers 
FOR UPDATE 
USING (can_manage_family(auth.uid(), family_id));

CREATE POLICY "Family admins can delete placeholder carers" 
ON public.placeholder_carers 
FOR DELETE 
USING (can_manage_family(auth.uid(), family_id));

-- Create function to link placeholder carer when user signs up
CREATE OR REPLACE FUNCTION public.link_placeholder_carer(_user_id UUID, _email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _placeholder RECORD;
  _linked_count INTEGER := 0;
BEGIN
  -- Find all placeholder carers with matching email
  FOR _placeholder IN 
    SELECT * FROM public.placeholder_carers 
    WHERE email = _email AND is_linked = FALSE
  LOOP
    -- Update placeholder carer to linked
    UPDATE public.placeholder_carers
    SET linked_user_id = _user_id, is_linked = TRUE, updated_at = NOW()
    WHERE id = _placeholder.id;
    
    -- Transfer shift assignments from placeholder to real user
    UPDATE public.shift_assignments
    SET carer_id = _user_id, placeholder_carer_id = NULL, updated_at = NOW()
    WHERE placeholder_carer_id = _placeholder.id;
    
    -- Create user membership for the family if not exists
    INSERT INTO public.user_memberships (user_id, family_id, role)
    VALUES (_user_id, _placeholder.family_id, 'carer')
    ON CONFLICT (user_id, family_id) DO NOTHING;
    
    _linked_count := _linked_count + 1;
  END LOOP;
  
  RETURN _linked_count;
END;
$$;

-- Update handle_new_user to call link_placeholder_carer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_role app_role;
  _family_id uuid;
  _first_name text;
  _linked_count integer;
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
  
  -- Try to link any placeholder carers with matching email
  _linked_count := public.link_placeholder_carer(NEW.id, NEW.email);
  
  -- Create family for admin roles only if no placeholder was linked
  IF _user_role IN ('family_admin', 'disabled_person') 
     AND _linked_count = 0
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
$$;

-- Create trigger for updating updated_at on placeholder_carers
CREATE TRIGGER update_placeholder_carers_updated_at
  BEFORE UPDATE ON public.placeholder_carers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();