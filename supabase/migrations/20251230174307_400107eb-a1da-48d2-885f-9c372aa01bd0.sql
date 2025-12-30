-- Update get_shift_instances_with_names to include attendance_mode
DROP FUNCTION IF EXISTS public.get_shift_instances_with_names(uuid, date, date);

CREATE FUNCTION public.get_shift_instances_with_names(_family_id uuid, _start_date date, _end_date date)
 RETURNS TABLE(
   id uuid, 
   shift_assignment_id uuid, 
   scheduled_date date, 
   start_time time without time zone, 
   end_time time without time zone, 
   carer_id uuid, 
   carer_name text, 
   status shift_status, 
   shift_type text, 
   placeholder_carer_id uuid, 
   placeholder_carer_name text, 
   pending_export boolean, 
   original_carer_name text,
   attendance_mode attendance_mode
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    si.id,
    si.shift_assignment_id,
    si.scheduled_date,
    sa.start_time,
    sa.end_time,
    sa.carer_id,
    COALESCE(
      p.full_name, 
      pc.full_name, 
      sa.original_carer_name,
      'Unassigned'
    ) as carer_name,
    si.status,
    sa.shift_type,
    sa.placeholder_carer_id,
    pc.full_name as placeholder_carer_name,
    COALESCE(sa.pending_export, false) as pending_export,
    sa.original_carer_name,
    si.attendance_mode
  FROM public.shift_instances si
  JOIN public.shift_assignments sa ON si.shift_assignment_id = sa.id
  LEFT JOIN public.profiles p ON sa.carer_id = p.id
  LEFT JOIN public.placeholder_carers pc ON sa.placeholder_carer_id = pc.id
  WHERE sa.family_id = _family_id
    AND si.scheduled_date >= _start_date
    AND si.scheduled_date <= _end_date
  ORDER BY si.scheduled_date, sa.start_time;
$function$;