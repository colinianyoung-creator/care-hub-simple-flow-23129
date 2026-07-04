-- =========================================================
-- MAR functions: enforce family membership
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_todays_mar_log(_family_id uuid, _date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(dose_id uuid, medication_id uuid, medication_name text, medication_dosage text, due_date date, due_time time without time zone, status text, given_by_id uuid, given_by_name text, administered_at timestamp with time zone, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_family_member(auth.uid(), _family_id) THEN
    RAISE EXCEPTION 'Not authorized to access this family''s medication log';
  END IF;

  RETURN QUERY
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_dose(_dose_id uuid, _new_status text, _carer_id uuid, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_status TEXT;
  _family_id UUID;
BEGIN
  -- Get old status and owning family
  SELECT status, family_id INTO _old_status, _family_id
  FROM public.mar_doses WHERE id = _dose_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dose not found';
  END IF;

  -- Enforce family membership; ignore any client-supplied carer id
  IF NOT public.is_family_member(auth.uid(), _family_id) THEN
    RAISE EXCEPTION 'Not authorized to modify this dose';
  END IF;

  _carer_id := auth.uid();

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
$function$;

CREATE OR REPLACE FUNCTION public.generate_mar_doses_for_medication(_medication_id uuid, _start_date date DEFAULT CURRENT_DATE, _days_ahead integer DEFAULT 7)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Enforce family membership
  IF NOT public.is_family_member(auth.uid(), _med.family_id) THEN
    RAISE EXCEPTION 'Not authorized to generate doses for this medication';
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
$function$;

-- =========================================================
-- Shift schedule functions: enforce family membership
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_shift_instances_with_names(_family_id uuid, _start_date date, _end_date date)
 RETURNS TABLE(id uuid, shift_assignment_id uuid, scheduled_date date, start_time time without time zone, end_time time without time zone, carer_id uuid, carer_name text, status shift_status, shift_type text, placeholder_carer_id uuid, placeholder_carer_name text, pending_export boolean, original_carer_name text, attendance_mode attendance_mode)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_family_member(auth.uid(), _family_id) THEN
    RAISE EXCEPTION 'Not authorized to access this family''s schedule';
  END IF;

  RETURN QUERY
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
END;
$function$;

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

  -- Enforce family membership
  IF NOT public.is_family_member(auth.uid(), _assignment.family_id) THEN
    RAISE EXCEPTION 'Not authorized to generate shifts for this family';
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

-- =========================================================
-- Shift change request functions: enforce family management
-- =========================================================

CREATE OR REPLACE FUNCTION public.apply_change_request(p_request_id uuid, p_applied_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_time_entry RECORD;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(auth.uid(), v_request.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Always attribute the action to the authenticated caller
  p_applied_by := auth.uid();

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not pending');
  END IF;

  SELECT * INTO v_time_entry
  FROM public.time_entries
  WHERE id = v_request.time_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time entry not found');
  END IF;

  v_snapshot := jsonb_build_object(
    'id', v_time_entry.id,
    'clock_in', v_time_entry.clock_in,
    'clock_out', v_time_entry.clock_out,
    'shift_type', v_time_entry.shift_type,
    'notes', v_time_entry.notes,
    'user_id', v_time_entry.user_id,
    'family_id', v_time_entry.family_id,
    'captured_at', NOW()
  );

  UPDATE public.time_entries
  SET 
    clock_in = v_request.new_start_time,
    clock_out = v_request.new_end_time,
    shift_type = COALESCE(v_request.new_shift_type, shift_type),
    updated_at = NOW()
  WHERE id = v_request.time_entry_id;

  UPDATE public.shift_change_requests
  SET 
    status = 'applied',
    original_shift_snapshot = v_snapshot,
    applied_at = NOW(),
    applied_by = p_applied_by,
    reviewed_by = p_applied_by,
    reviewed_at = NOW(),
    edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'applied',
        'timestamp', NOW(),
        'by', p_applied_by,
        'changes', jsonb_build_object(
          'from', v_snapshot,
          'to', jsonb_build_object(
            'clock_in', v_request.new_start_time,
            'clock_out', v_request.new_end_time,
            'shift_type', v_request.new_shift_type
          )
        )
      )
    ),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Change applied successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.deny_change_request(p_request_id uuid, p_denied_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(auth.uid(), v_request.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  p_denied_by := auth.uid();

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not pending');
  END IF;

  UPDATE public.shift_change_requests
  SET 
    status = 'denied',
    reviewed_by = p_denied_by,
    reviewed_at = NOW(),
    edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'denied',
        'timestamp', NOW(),
        'by', p_denied_by,
        'reason', p_reason
      )
    ),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Request denied');
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_change_request(p_request_id uuid, p_reverted_by uuid, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_snapshot jsonb;
  v_current_entry RECORD;
  v_conflicts jsonb;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(auth.uid(), v_request.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  p_reverted_by := auth.uid();

  IF v_request.status NOT IN ('applied', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not in applied/approved status');
  END IF;

  v_snapshot := v_request.original_shift_snapshot;

  IF v_snapshot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No original snapshot available for revert');
  END IF;

  SELECT * INTO v_current_entry
  FROM public.time_entries
  WHERE id = v_request.time_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time entry no longer exists');
  END IF;

  IF v_current_entry.updated_at > v_request.applied_at AND NOT p_force THEN
    v_conflicts := jsonb_build_object(
      'type', 'entry_modified_after_apply',
      'time_entry_id', v_current_entry.id,
      'applied_at', v_request.applied_at,
      'modified_at', v_current_entry.updated_at
    );
    RETURN jsonb_build_object('success', false, 'error', 'CONFLICT', 'conflicts', v_conflicts);
  END IF;

  UPDATE public.time_entries
  SET 
    clock_in = (v_snapshot->>'clock_in')::timestamptz,
    clock_out = (v_snapshot->>'clock_out')::timestamptz,
    shift_type = COALESCE(v_snapshot->>'shift_type', 'basic'),
    notes = v_snapshot->>'notes',
    updated_at = NOW()
  WHERE id = v_request.time_entry_id;

  UPDATE public.shift_change_requests
  SET 
    status = 'reverted',
    reverted_at = NOW(),
    reverted_by = p_reverted_by,
    edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'reverted',
        'timestamp', NOW(),
        'by', p_reverted_by,
        'pre_revert_state', jsonb_build_object(
          'clock_in', v_current_entry.clock_in,
          'clock_out', v_current_entry.clock_out,
          'shift_type', v_current_entry.shift_type
        ),
        'restored_to', v_snapshot,
        'forced', p_force
      )
    ),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Change reverted successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_change_request(p_request_id uuid, p_archived_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(auth.uid(), v_request.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  p_archived_by := auth.uid();

  UPDATE public.shift_change_requests
  SET 
    status = 'archived',
    archived_at = NOW(),
    edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'archived',
        'timestamp', NOW(),
        'by', p_archived_by,
        'previous_status', v_request.status
      )
    ),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Request archived successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.unarchive_change_request(p_request_id uuid, p_unarchived_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_previous_status text;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF NOT public.can_manage_family(auth.uid(), v_request.family_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  p_unarchived_by := auth.uid();

  IF v_request.status != 'archived' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not archived');
  END IF;

  SELECT (elem->>'previous_status') INTO v_previous_status
  FROM jsonb_array_elements(v_request.edit_history) AS elem
  WHERE elem->>'action' = 'archived'
  ORDER BY (elem->>'timestamp')::timestamptz DESC
  LIMIT 1;

  v_previous_status := COALESCE(v_previous_status, 'applied');

  UPDATE public.shift_change_requests
  SET 
    status = v_previous_status,
    archived_at = NULL,
    edit_history = COALESCE(edit_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'unarchived',
        'timestamp', NOW(),
        'by', p_unarchived_by,
        'restored_status', v_previous_status
      )
    ),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Request unarchived successfully', 'restored_status', v_previous_status);
END;
$function$;

-- =========================================================
-- Revoke anonymous EXECUTE on all SECURITY DEFINER functions
-- in the public schema; keep access for signed-in users and
-- internal services only.
-- =========================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC;', r.fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon;', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', r.fn);
  END LOOP;
END $$;