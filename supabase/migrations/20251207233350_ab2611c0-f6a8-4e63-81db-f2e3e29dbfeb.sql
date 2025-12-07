-- Enhanced Change Requests System
-- First, drop the existing status check constraint
ALTER TABLE public.shift_change_requests 
DROP CONSTRAINT IF EXISTS shift_change_requests_status_check;

-- Add new status check constraint with all valid status values
ALTER TABLE public.shift_change_requests 
ADD CONSTRAINT shift_change_requests_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'applied'::text, 'denied'::text, 'rejected'::text, 'archived'::text, 'reverted'::text]));

-- Add original_shift_snapshot to store pre-change state
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS original_shift_snapshot jsonb;

-- Add applied tracking columns
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS applied_at timestamptz,
ADD COLUMN IF NOT EXISTS applied_by uuid REFERENCES public.profiles(id);

-- Add revert tracking columns
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
ADD COLUMN IF NOT EXISTS reverted_by uuid REFERENCES public.profiles(id);

-- Add edit history for audit trail
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;

-- Add archived tracking
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add parent request reference for corrections
ALTER TABLE public.shift_change_requests 
ADD COLUMN IF NOT EXISTS parent_request_id uuid REFERENCES public.shift_change_requests(id);

-- Migrate existing approved requests to 'applied' status
UPDATE public.shift_change_requests
SET 
  status = 'applied',
  applied_at = reviewed_at,
  applied_by = reviewed_by,
  edit_history = jsonb_build_array(
    jsonb_build_object(
      'action', 'migrated_from_approved',
      'timestamp', NOW(),
      'note', 'Migrated from legacy approved status - original_shift_snapshot not available'
    )
  )
WHERE status = 'approved' AND applied_at IS NULL;

-- Migrate 'rejected' to 'denied' for consistency
UPDATE public.shift_change_requests
SET status = 'denied'
WHERE status = 'rejected';

-- Create function to apply a change request atomically
CREATE OR REPLACE FUNCTION public.apply_change_request(
  p_request_id uuid,
  p_applied_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create function to revert a change request
CREATE OR REPLACE FUNCTION public.revert_change_request(
  p_request_id uuid,
  p_reverted_by uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create function to archive a change request
CREATE OR REPLACE FUNCTION public.archive_change_request(
  p_request_id uuid,
  p_archived_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

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
$$;

-- Create function to unarchive a change request
CREATE OR REPLACE FUNCTION public.unarchive_change_request(
  p_request_id uuid,
  p_unarchived_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create function to deny a change request
CREATE OR REPLACE FUNCTION public.deny_change_request(
  p_request_id uuid,
  p_denied_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.shift_change_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

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
$$;