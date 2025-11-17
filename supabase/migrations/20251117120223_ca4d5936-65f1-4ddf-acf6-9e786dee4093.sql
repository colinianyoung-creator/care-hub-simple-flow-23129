-- Add shift_type column to shift_assignments table
ALTER TABLE shift_assignments 
ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'basic';

-- Add index for better performance on shift_instance queries
CREATE INDEX IF NOT EXISTS idx_shift_instances_assignment_date 
ON shift_instances(shift_assignment_id, scheduled_date);

-- Add index for time_entries linked to shift_instances
CREATE INDEX IF NOT EXISTS idx_time_entries_shift_instance 
ON time_entries(shift_instance_id) WHERE shift_instance_id IS NOT NULL;

-- Update the generate_shift_instances function to handle shift_type
CREATE OR REPLACE FUNCTION public.generate_shift_instances(_assignment_id uuid, _start_date date, _end_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.shift_instances (shift_assignment_id, scheduled_date, status)
      VALUES (_assignment_id, _current_date, 'scheduled'::shift_status)
      ON CONFLICT (shift_assignment_id, scheduled_date) DO NOTHING;
      
      _count := _count + 1;
    END IF;
    
    _current_date := _current_date + 1;
  END LOOP;
  
  RETURN _count;
END;
$function$;