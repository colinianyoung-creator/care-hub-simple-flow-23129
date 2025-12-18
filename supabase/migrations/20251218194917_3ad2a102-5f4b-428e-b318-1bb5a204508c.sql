-- Add visible_from column to control when tasks become visible
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS visible_from date DEFAULT CURRENT_DATE;

-- Update existing tasks to have visible_from set to their created_at date
UPDATE public.tasks 
SET visible_from = DATE(created_at) 
WHERE visible_from IS NULL;

-- Function to calculate when the next recurring task instance should become visible
CREATE OR REPLACE FUNCTION public.get_next_visible_from_date(recurrence_type text, from_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE recurrence_type
    WHEN 'daily' THEN
      -- Daily tasks become visible immediately the next day
      RETURN from_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      -- Weekly tasks become visible next Monday
      -- EXTRACT(DOW) returns 0=Sunday, 1=Monday, etc.
      RETURN from_date + ((8 - EXTRACT(DOW FROM from_date)::int) % 7 + 7)::int % 7 + CASE WHEN EXTRACT(DOW FROM from_date) = 1 THEN 7 ELSE 0 END;
    WHEN 'monthly' THEN
      -- Monthly tasks become visible 1st of next month
      RETURN DATE_TRUNC('month', from_date) + INTERVAL '1 month';
    ELSE
      RETURN from_date + INTERVAL '1 day';
  END CASE;
END;
$function$;

-- Simpler version for weekly - next Monday calculation
CREATE OR REPLACE FUNCTION public.get_next_monday(from_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT from_date + ((7 - EXTRACT(DOW FROM from_date)::int + 1) % 7 + CASE WHEN EXTRACT(DOW FROM from_date) = 1 THEN 7 ELSE 0 END)::int;
$function$;

-- Update get_next_visible_from_date to use the simpler helper
CREATE OR REPLACE FUNCTION public.get_next_visible_from_date(recurrence_type text, from_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE recurrence_type
    WHEN 'daily' THEN
      RETURN from_date + 1;
    WHEN 'weekly' THEN
      RETURN public.get_next_monday(from_date);
    WHEN 'monthly' THEN
      RETURN (DATE_TRUNC('month', from_date) + INTERVAL '1 month')::date;
    ELSE
      RETURN from_date + 1;
  END CASE;
END;
$function$;

-- Function to safely create a recurring task instance (with duplicate check)
CREATE OR REPLACE FUNCTION public.create_recurring_task_instance(
  _parent_task_id uuid,
  _family_id uuid,
  _title text,
  _description text,
  _assigned_to uuid,
  _created_by uuid,
  _recurrence_type text,
  _next_due_date date,
  _visible_from date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing_count integer;
  _new_task_id uuid;
BEGIN
  -- Check for existing future instance from same parent
  SELECT COUNT(*) INTO _existing_count
  FROM public.tasks
  WHERE (parent_task_id = _parent_task_id OR id = _parent_task_id)
    AND family_id = _family_id
    AND is_recurring = true
    AND is_archived = false
    AND completed = false
    AND visible_from >= CURRENT_DATE;
  
  IF _existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'duplicate_exists',
      'message', 'A future instance already exists for this recurring task'
    );
  END IF;
  
  -- Create new instance
  INSERT INTO public.tasks (
    family_id,
    title,
    description,
    due_date,
    assigned_to,
    created_by,
    is_recurring,
    recurrence_type,
    parent_task_id,
    visible_from,
    completed,
    is_archived
  ) VALUES (
    _family_id,
    _title,
    _description,
    _next_due_date,
    _assigned_to,
    _created_by,
    true,
    _recurrence_type,
    COALESCE(_parent_task_id, gen_random_uuid()),
    _visible_from,
    false,
    false
  )
  RETURNING id INTO _new_task_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'task_id', _new_task_id,
    'visible_from', _visible_from,
    'due_date', _next_due_date
  );
END;
$function$;