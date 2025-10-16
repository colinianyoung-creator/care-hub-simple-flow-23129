-- ============================================
-- COMPLETE DATABASE SCHEMA RECREATION
-- ============================================

-- ============================================
-- 1. EXTENSIONS AND TYPES
-- ============================================

-- Create app_role enum for user roles within families
CREATE TYPE public.app_role AS ENUM (
  'carer',
  'family_admin',
  'family_viewer',
  'disabled_person',
  'manager',
  'agency'
);

-- Create leave_status enum for leave requests
CREATE TYPE public.leave_status AS ENUM (
  'pending',
  'approved',
  'denied',
  'cancelled'
);

-- Create shift_status enum
CREATE TYPE public.shift_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'absent'
);

-- ============================================
-- 2. CORE TABLES
-- ============================================

-- Families table - represents care organizations/families
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Profiles table - user profile information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User memberships - links users to families with roles (ROLES STORED HERE)
CREATE TABLE public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'carer',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, family_id)
);

-- Care recipients - people receiving care
CREATE TABLE public.care_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  medical_info TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Shift assignments - scheduled shifts for carers
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  carer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Shift instances - individual shift occurrences
CREATE TABLE public.shift_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_assignment_id UUID REFERENCES public.shift_assignments(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  status public.shift_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Time entries - clock in/out records
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shift_instance_id UUID REFERENCES public.shift_instances(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,
  total_hours NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Leave requests - absence management
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status public.leave_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Care notes - notes about care activities
CREATE TABLE public.care_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  care_recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  care_recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Medications
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  care_recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  instructions TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Diet entries
CREATE TABLE public.diet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  care_recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  meal_type TEXT,
  description TEXT NOT NULL,
  notes TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Money records
CREATE TABLE public.money_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  care_recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Invite codes
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  role public.app_role NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Role change requests (renamed current_role to from_role to avoid reserved keyword)
CREATE TABLE public.role_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  from_role public.app_role NOT NULL,
  requested_role public.app_role NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. SECURITY DEFINER FUNCTIONS
-- ============================================

-- Get user's role in a family
CREATE OR REPLACE FUNCTION public.get_user_family_role(_user_id UUID, _family_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_memberships
  WHERE user_id = _user_id AND family_id = _family_id
  LIMIT 1;
$$;

-- Check if user has specific role in family
CREATE OR REPLACE FUNCTION public.has_family_role(_user_id UUID, _family_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_memberships
    WHERE user_id = _user_id 
      AND family_id = _family_id 
      AND role = _role
  );
$$;

-- Check if user is member of family
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_memberships
    WHERE user_id = _user_id AND family_id = _family_id
  );
$$;

-- Check if user is admin of family
CREATE OR REPLACE FUNCTION public.is_family_admin(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_memberships
    WHERE user_id = _user_id 
      AND family_id = _family_id 
      AND role = 'family_admin'
  );
$$;

-- Get user profile safely
CREATE OR REPLACE FUNCTION public.get_profile_safe()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  profile_picture_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, full_name, phone, profile_picture_url
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _email TEXT;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get email from auth.users
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  
  -- Insert profile if not exists
  INSERT INTO public.profiles (id, email)
  VALUES (_user_id, _email)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN _user_id;
END;
$$;

-- Generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite(
  _family_id UUID,
  _role public.app_role,
  _expires_days INTEGER DEFAULT 7
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT public.is_family_admin(_user_id, _family_id) THEN
    RAISE EXCEPTION 'Only family admins can generate invites';
  END IF;
  
  -- Generate random code
  _code := encode(gen_random_bytes(6), 'hex');
  
  -- Insert invite
  INSERT INTO public.invite_codes (family_id, code, role, created_by, expires_at)
  VALUES (_family_id, _code, _role, _user_id, now() + (_expires_days || ' days')::INTERVAL);
  
  RETURN _code;
END;
$$;

-- Redeem invite code
CREATE OR REPLACE FUNCTION public.redeem_invite(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Ensure profile exists
  PERFORM public.ensure_user_profile();
  
  -- Get invite
  SELECT * INTO _invite
  FROM public.invite_codes
  WHERE code = _code
    AND used_by IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Add user to family
  INSERT INTO public.user_memberships (user_id, family_id, role)
  VALUES (_user_id, _invite.family_id, _invite.role)
  ON CONFLICT (user_id, family_id) DO NOTHING;
  
  -- Mark invite as used
  UPDATE public.invite_codes
  SET used_by = _user_id, used_at = now()
  WHERE id = _invite.id;
  
  RETURN _invite.family_id;
END;
$$;

-- Generate shift instances for recurring shifts
CREATE OR REPLACE FUNCTION public.generate_shift_instances(
  _assignment_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment RECORD;
  _current_date DATE;
  _count INTEGER := 0;
BEGIN
  -- Get assignment details
  SELECT * INTO _assignment
  FROM public.shift_assignments
  WHERE id = _assignment_id AND active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Loop through dates
  _current_date := _start_date;
  WHILE _current_date <= _end_date LOOP
    -- Check if day matches
    IF EXTRACT(DOW FROM _current_date) = _assignment.day_of_week THEN
      -- Insert shift instance if not exists
      INSERT INTO public.shift_instances (shift_assignment_id, scheduled_date)
      VALUES (_assignment_id, _current_date)
      ON CONFLICT DO NOTHING;
      
      _count := _count + 1;
    END IF;
    
    _current_date := _current_date + 1;
  END LOOP;
  
  RETURN _count;
END;
$$;

-- Get shift instances with carer names
CREATE OR REPLACE FUNCTION public.get_shift_instances_with_names(
  _family_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  id UUID,
  shift_assignment_id UUID,
  scheduled_date DATE,
  start_time TIME,
  end_time TIME,
  carer_id UUID,
  carer_name TEXT,
  status public.shift_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.shift_assignment_id,
    si.scheduled_date,
    sa.start_time,
    sa.end_time,
    sa.carer_id,
    p.full_name as carer_name,
    si.status
  FROM public.shift_instances si
  JOIN public.shift_assignments sa ON si.shift_assignment_id = sa.id
  LEFT JOIN public.profiles p ON sa.carer_id = p.id
  WHERE sa.family_id = _family_id
    AND si.scheduled_date >= _start_date
    AND si.scheduled_date <= _end_date
  ORDER BY si.scheduled_date, sa.start_time;
$$;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of family members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_memberships um1
      WHERE um1.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.user_memberships um2
          WHERE um2.user_id = profiles.id
            AND um2.family_id = um1.family_id
        )
    )
  );

-- FAMILIES POLICIES
CREATE POLICY "Users can view families they belong to"
  ON public.families FOR SELECT
  USING (public.is_family_member(auth.uid(), id));

CREATE POLICY "Family admins can update their family"
  ON public.families FOR UPDATE
  USING (public.is_family_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- USER MEMBERSHIPS POLICIES
CREATE POLICY "Users can view their own memberships"
  ON public.user_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships in their families"
  ON public.user_memberships FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert memberships"
  ON public.user_memberships FOR INSERT
  WITH CHECK (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can update memberships"
  ON public.user_memberships FOR UPDATE
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Users can delete their own membership"
  ON public.user_memberships FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Family admins can delete memberships"
  ON public.user_memberships FOR DELETE
  USING (public.is_family_admin(auth.uid(), family_id));

-- CARE RECIPIENTS POLICIES
CREATE POLICY "Family members can view care recipients"
  ON public.care_recipients FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage care recipients"
  ON public.care_recipients FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- SHIFT ASSIGNMENTS POLICIES
CREATE POLICY "Family members can view shift assignments"
  ON public.shift_assignments FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage shift assignments"
  ON public.shift_assignments FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Disabled persons can manage shift assignments"
  ON public.shift_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_memberships
      WHERE user_id = auth.uid()
        AND family_id = shift_assignments.family_id
        AND role = 'disabled_person'
    )
  );

-- SHIFT INSTANCES POLICIES
CREATE POLICY "Family members can view shift instances"
  ON public.shift_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shift_assignments sa
      WHERE sa.id = shift_instances.shift_assignment_id
        AND public.is_family_member(auth.uid(), sa.family_id)
    )
  );

CREATE POLICY "Family admins can manage shift instances"
  ON public.shift_instances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shift_assignments sa
      WHERE sa.id = shift_instances.shift_assignment_id
        AND public.is_family_admin(auth.uid(), sa.family_id)
    )
  );

-- TIME ENTRIES POLICIES
CREATE POLICY "Users can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Family members can view time entries in their family"
  ON public.time_entries FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Carers can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Carers can update their own time entries"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Family admins can manage all time entries"
  ON public.time_entries FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- LEAVE REQUESTS POLICIES
CREATE POLICY "Users can view their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Family admins can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Users can create leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Users can update their pending leave requests"
  ON public.leave_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Family admins can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (public.is_family_admin(auth.uid(), family_id));

-- CARE NOTES POLICIES
CREATE POLICY "Family members can view care notes"
  ON public.care_notes FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create care notes"
  ON public.care_notes FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND author_id = auth.uid());

CREATE POLICY "Authors can update their own care notes"
  ON public.care_notes FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Family admins can manage all care notes"
  ON public.care_notes FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- TASKS POLICIES
CREATE POLICY "Family members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Assigned users can update their tasks"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Family admins can manage all tasks"
  ON public.tasks FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- APPOINTMENTS POLICIES
CREATE POLICY "Family members can view appointments"
  ON public.appointments FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Creators can update their appointments"
  ON public.appointments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Family admins can manage all appointments"
  ON public.appointments FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- MEDICATIONS POLICIES
CREATE POLICY "Family members can view medications"
  ON public.medications FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage medications"
  ON public.medications FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- DIET ENTRIES POLICIES
CREATE POLICY "Family members can view diet entries"
  ON public.diet_entries FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create diet entries"
  ON public.diet_entries FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Family admins can manage diet entries"
  ON public.diet_entries FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- MONEY RECORDS POLICIES
CREATE POLICY "Family members can view money records"
  ON public.money_records FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create money records"
  ON public.money_records FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Family admins can manage money records"
  ON public.money_records FOR ALL
  USING (public.is_family_admin(auth.uid(), family_id));

-- INVITE CODES POLICIES
CREATE POLICY "Family admins can view invite codes"
  ON public.invite_codes FOR SELECT
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Anyone can view unexpired unused invites for redemption"
  ON public.invite_codes FOR SELECT
  USING (used_by IS NULL AND expires_at > now());

-- ROLE CHANGE REQUESTS POLICIES
CREATE POLICY "Users can view their own role change requests"
  ON public.role_change_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Family admins can view role change requests"
  ON public.role_change_requests FOR SELECT
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Users can create role change requests"
  ON public.role_change_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family admins can update role change requests"
  ON public.role_change_requests FOR UPDATE
  USING (public.is_family_admin(auth.uid(), family_id));

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_care_recipients_updated_at BEFORE UPDATE ON public.care_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_care_notes_updated_at BEFORE UPDATE ON public.care_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX idx_user_memberships_family_id ON public.user_memberships(family_id);
CREATE INDEX idx_shift_assignments_family_id ON public.shift_assignments(family_id);
CREATE INDEX idx_shift_assignments_carer_id ON public.shift_assignments(carer_id);
CREATE INDEX idx_shift_instances_assignment_id ON public.shift_instances(shift_assignment_id);
CREATE INDEX idx_shift_instances_scheduled_date ON public.shift_instances(scheduled_date);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_family_id ON public.time_entries(family_id);
CREATE INDEX idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX idx_leave_requests_family_id ON public.leave_requests(family_id);
CREATE INDEX idx_care_notes_family_id ON public.care_notes(family_id);
CREATE INDEX idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX idx_appointments_family_id ON public.appointments(family_id);
CREATE INDEX idx_medications_family_id ON public.medications(family_id);
CREATE INDEX idx_diet_entries_family_id ON public.diet_entries(family_id);
CREATE INDEX idx_money_records_family_id ON public.money_records(family_id);
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_family_id ON public.invite_codes(family_id);