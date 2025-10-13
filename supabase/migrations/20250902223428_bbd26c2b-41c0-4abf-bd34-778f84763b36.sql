-- Fix security warnings by updating functions with proper search_path

-- Fix has_family_role function - use CREATE OR REPLACE to avoid dependency issues
CREATE OR REPLACE FUNCTION public.has_family_role(_user_id uuid, _family_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
      AND m.role = _role
  );
$$;

-- Fix is_member function  
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_memberships m
    WHERE m.user_id = _user_id
      AND m.family_id = _family_id
  );
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix validate_time_entry_approval function
CREATE OR REPLACE FUNCTION public.validate_time_entry_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;