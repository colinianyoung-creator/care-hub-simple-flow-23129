-- Add contact fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN contact_email text,
ADD COLUMN contact_phone text;

-- Create appointments table
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  care_recipient_id uuid,
  title text NOT NULL,
  description text,
  appointment_date timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text,
  notes text,
  status text DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create appointments policies
CREATE POLICY "Family members can view appointments" 
ON public.appointments 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Creators and admins can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (created_by = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

CREATE POLICY "Creators and admins can delete appointments" 
ON public.appointments 
FOR DELETE 
USING (created_by = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Create medications table
CREATE TABLE public.medications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  care_recipient_id uuid,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  times_per_day integer NOT NULL DEFAULT 1,
  time_slots time[] NOT NULL DEFAULT ARRAY[]::time[],
  instructions text,
  start_date date DEFAULT current_date,
  end_date date,
  active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on medications
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Create medications policies
CREATE POLICY "Family members can view medications" 
ON public.medications 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create medications" 
ON public.medications 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Creators and admins can update medications" 
ON public.medications 
FOR UPDATE 
USING (created_by = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

CREATE POLICY "Creators and admins can delete medications" 
ON public.medications 
FOR DELETE 
USING (created_by = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Create medication logs table for tracking when medications are given
CREATE TABLE public.medication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  given_at timestamp with time zone NOT NULL,
  scheduled_time time NOT NULL,
  given_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on medication logs
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Create medication logs policies
CREATE POLICY "Family members can view medication logs" 
ON public.medication_logs 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create medication logs" 
ON public.medication_logs 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND given_by = auth.uid());

CREATE POLICY "Creators and admins can update medication logs" 
ON public.medication_logs 
FOR UPDATE 
USING (given_by = auth.uid() OR has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Add indexes for better performance
CREATE INDEX idx_appointments_family_date ON public.appointments(family_id, appointment_date);
CREATE INDEX idx_medications_family_active ON public.medications(family_id, active);
CREATE INDEX idx_medication_logs_medication_date ON public.medication_logs(medication_id, given_at);

-- Add updated_at triggers
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();