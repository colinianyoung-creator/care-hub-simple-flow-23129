-- Update generate_shift_instances to include attendance_mode from shift_assignment
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
      -- Insert shift instance with attendance_mode from assignment
      INSERT INTO public.shift_instances (
        shift_assignment_id, 
        scheduled_date, 
        status,
        attendance_mode
      )
      VALUES (
        _assignment_id, 
        _current_date, 
        'scheduled'::shift_status,
        COALESCE(_assignment.default_attendance_mode, 'none'::attendance_mode)
      )
      ON CONFLICT (shift_assignment_id, scheduled_date) DO NOTHING;
      
      _count := _count + 1;
    END IF;
    
    _current_date := _current_date + 1;
  END LOOP;
  
  RETURN _count;
END;
$function$;