-- ============================================
-- MAR SYSTEM: COMPREHENSIVE MEDICATION ADMINISTRATION RECORD
-- ============================================

-- 1. CREATE mar_doses TABLE (Core scheduled dose tracking)
CREATE TABLE IF NOT EXISTS public.mar_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  due_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'given', 'refused', 'missed')),
  given_by UUID REFERENCES public.profiles(id),
  administered_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(medication_id, due_date, due_time)
);

-- Enable RLS
ALTER TABLE public.mar_doses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mar_doses
CREATE POLICY "Family members can view doses"
ON public.mar_doses FOR SELECT
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create doses"
ON public.mar_doses FOR INSERT
WITH CHECK (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can update doses"
ON public.mar_doses FOR UPDATE
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can delete doses"
ON public.mar_doses FOR DELETE
USING (is_family_admin(auth.uid(), family_id));

-- 2. CREATE mar_history TABLE (Audit trail)
CREATE TABLE IF NOT EXISTS public.mar_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dose_id UUID NOT NULL REFERENCES public.mar_doses(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

-- Enable RLS
ALTER TABLE public.mar_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for mar_history
CREATE POLICY "Family members can view history"
ON public.mar_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mar_doses d
    WHERE d.id = mar_history.dose_id
    AND is_family_member(auth.uid(), d.family_id)
  )
);

-- 3. UPDATE medications TABLE - Add time_slots column
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS time_slots TIME[] DEFAULT ARRAY['09:00:00'::TIME];

-- 4. CREATE RPC: generate_mar_doses_for_medication
CREATE OR REPLACE FUNCTION public.generate_mar_doses_for_medication(
  _medication_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE,
  _days_ahead INT DEFAULT 7
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _med RECORD;
  _date DATE;
  _time_slot TIME;
  _count INT := 0;
BEGIN
  -- Get medication details
  SELECT * INTO _med FROM public.medications WHERE id = _medication_id AND is_archived = FALSE;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Generate doses for next N days
  FOR i IN 0.._days_ahead LOOP
    _date := _start_date + i;
    
    -- Insert doses for each time slot
    FOREACH _time_slot IN ARRAY _med.time_slots
    LOOP
      INSERT INTO public.mar_doses (family_id, medication_id, due_date, due_time, status)
      VALUES (_med.family_id, _medication_id, _date, _time_slot, 'pending')
      ON CONFLICT (medication_id, due_date, due_time) DO NOTHING;
      
      IF FOUND THEN
        _count := _count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN _count;
END;
$$;

-- 5. CREATE RPC: mark_dose (Update dose status and log to audit trail)
CREATE OR REPLACE FUNCTION public.mark_dose(
  _dose_id UUID,
  _new_status TEXT,
  _carer_id UUID,
  _note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status TEXT;
BEGIN
  -- Get old status
  SELECT status INTO _old_status FROM public.mar_doses WHERE id = _dose_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dose not found';
  END IF;
  
  -- Update dose
  UPDATE public.mar_doses
  SET 
    status = _new_status,
    given_by = _carer_id,
    administered_at = CASE WHEN _new_status = 'given' THEN NOW() ELSE administered_at END,
    note = _note,
    updated_at = NOW()
  WHERE id = _dose_id;
  
  -- Log to audit trail
  INSERT INTO public.mar_history (dose_id, old_status, new_status, changed_by, note)
  VALUES (_dose_id, _old_status, _new_status, _carer_id, _note);
END;
$$;

-- 6. CREATE RPC: get_todays_mar_log
CREATE OR REPLACE FUNCTION public.get_todays_mar_log(
  _family_id UUID,
  _date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  dose_id UUID,
  medication_id UUID,
  medication_name TEXT,
  medication_dosage TEXT,
  due_date DATE,
  due_time TIME,
  status TEXT,
  given_by_id UUID,
  given_by_name TEXT,
  administered_at TIMESTAMPTZ,
  note TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id AS dose_id,
    m.id AS medication_id,
    m.name AS medication_name,
    m.dosage AS medication_dosage,
    d.due_date,
    d.due_time,
    d.status,
    d.given_by AS given_by_id,
    p.full_name AS given_by_name,
    d.administered_at,
    d.note
  FROM public.mar_doses d
  JOIN public.medications m ON d.medication_id = m.id
  LEFT JOIN public.profiles p ON d.given_by = p.id
  WHERE d.family_id = _family_id
    AND d.due_date = _date
  ORDER BY d.due_time, m.name;
$$;

-- 7. CREATE TRIGGER: Auto-generate doses on medication creation
CREATE OR REPLACE FUNCTION public.trigger_generate_mar_doses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate doses for next 7 days
  PERFORM public.generate_mar_doses_for_medication(NEW.id, CURRENT_DATE, 7);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_medication_insert ON public.medications;
CREATE TRIGGER after_medication_insert
AFTER INSERT ON public.medications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_mar_doses();

-- 8. CREATE TRIGGER: Update updated_at on mar_doses
DROP TRIGGER IF EXISTS update_mar_doses_updated_at ON public.mar_doses;
CREATE TRIGGER update_mar_doses_updated_at
BEFORE UPDATE ON public.mar_doses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Migrate existing medications to generate initial doses
DO $$
DECLARE
  med_record RECORD;
  _time_slots_array TIME[];
BEGIN
  FOR med_record IN 
    SELECT id, frequency FROM public.medications WHERE is_archived = FALSE
  LOOP
    -- Map frequency to time slots (renamed variable to avoid ambiguity)
    CASE med_record.frequency
      WHEN '1' THEN _time_slots_array := ARRAY['09:00:00'::TIME];
      WHEN '2' THEN _time_slots_array := ARRAY['09:00:00'::TIME, '18:00:00'::TIME];
      WHEN '3' THEN _time_slots_array := ARRAY['09:00:00'::TIME, '13:00:00'::TIME, '18:00:00'::TIME];
      WHEN '4' THEN _time_slots_array := ARRAY['09:00:00'::TIME, '13:00:00'::TIME, '18:00:00'::TIME, '21:00:00'::TIME];
      ELSE _time_slots_array := ARRAY['09:00:00'::TIME];
    END CASE;
    
    -- Update time_slots column
    UPDATE public.medications 
    SET time_slots = _time_slots_array 
    WHERE id = med_record.id;
    
    -- Generate doses
    PERFORM public.generate_mar_doses_for_medication(med_record.id, CURRENT_DATE, 7);
  END LOOP;
END $$;