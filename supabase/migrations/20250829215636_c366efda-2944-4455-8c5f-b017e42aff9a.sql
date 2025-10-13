-- Extend time_entries table with new fields
ALTER TABLE public.time_entries 
ADD COLUMN shift_type text DEFAULT 'variable' CHECK (shift_type IN ('fixed', 'variable')),
ADD COLUMN shift_assignment_id uuid,
ADD COLUMN hourly_rate decimal(10,2);

-- Create shift_assignments table for recurring schedules
CREATE TABLE public.shift_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  carer_id uuid NOT NULL,
  title text NOT NULL,
  days_of_week integer[] NOT NULL, -- 0=Sunday, 1=Monday, etc.
  start_time time NOT NULL,
  end_time time NOT NULL,
  hourly_rate decimal(10,2),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create shift_instances table for individual shift occurrences
CREATE TABLE public.shift_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_assignment_id uuid NOT NULL,
  family_id uuid NOT NULL,
  carer_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  notes text,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(shift_assignment_id, scheduled_date)
);

-- Create shift_requests table for holidays, swaps, sick days
CREATE TABLE public.shift_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('holiday', 'swap', 'sick_day', 'overtime')),
  shift_instance_id uuid,
  target_carer_id uuid, -- For swap requests
  start_date date NOT NULL,
  end_date date,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for shift_assignments
CREATE POLICY "Family members can view shift assignments" 
ON public.shift_assignments 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Admins can manage shift assignments" 
ON public.shift_assignments 
FOR ALL 
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'))
WITH CHECK ((has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person')) AND created_by = auth.uid());

-- RLS policies for shift_instances
CREATE POLICY "Family members can view shift instances" 
ON public.shift_instances 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Carers can confirm their own shifts" 
ON public.shift_instances 
FOR UPDATE 
USING (carer_id = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

CREATE POLICY "Admins can manage shift instances" 
ON public.shift_instances 
FOR ALL 
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'))
WITH CHECK (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- RLS policies for shift_requests
CREATE POLICY "Family members can view shift requests" 
ON public.shift_requests 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create shift requests" 
ON public.shift_requests 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND requester_id = auth.uid());

CREATE POLICY "Requesters and admins can update shift requests" 
ON public.shift_requests 
FOR UPDATE 
USING (requester_id = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Create triggers for updated_at
CREATE TRIGGER update_shift_assignments_updated_at
BEFORE UPDATE ON public.shift_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_instances_updated_at
BEFORE UPDATE ON public.shift_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_requests_updated_at
BEFORE UPDATE ON public.shift_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate shift instances from assignments
CREATE OR REPLACE FUNCTION public.generate_shift_instances(
  _assignment_id uuid,
  _start_date date,
  _end_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
        scheduled_date,
        start_time,
        end_time
      ) VALUES (
        assignment_record.id,
        assignment_record.family_id,
        assignment_record.carer_id,
        loop_date,
        assignment_record.start_time,
        assignment_record.end_time
      ) ON CONFLICT (shift_assignment_id, scheduled_date) DO NOTHING;
    END IF;
    
    loop_date := loop_date + interval '1 day';
  END LOOP;
END;
$$;