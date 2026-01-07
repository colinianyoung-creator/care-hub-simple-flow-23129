-- Step 1: Make NOT NULL attribution columns nullable so SET NULL can work
ALTER TABLE public.appointments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.care_notes ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.diet_entries ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.money_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.placeholder_carers ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.risk_assessments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.shift_change_requests ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.timesheet_exports ALTER COLUMN exported_by DROP NOT NULL;
ALTER TABLE public.body_logs ALTER COLUMN created_by DROP NOT NULL;

-- Step 2: Fix body_logs FK - drop auth.users reference and recreate pointing to profiles
ALTER TABLE public.body_logs DROP CONSTRAINT IF EXISTS body_logs_created_by_fkey;
ALTER TABLE public.body_logs 
  ADD CONSTRAINT body_logs_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 3: Drop and recreate all remaining FK constraints to profiles with ON DELETE SET NULL
-- appointments
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- attendance_exceptions
ALTER TABLE public.attendance_exceptions DROP CONSTRAINT IF EXISTS attendance_exceptions_resolved_by_fkey;
ALTER TABLE public.attendance_exceptions 
  ADD CONSTRAINT attendance_exceptions_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- care_notes
ALTER TABLE public.care_notes DROP CONSTRAINT IF EXISTS care_notes_author_id_fkey;
ALTER TABLE public.care_notes 
  ADD CONSTRAINT care_notes_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- diet_entries
ALTER TABLE public.diet_entries DROP CONSTRAINT IF EXISTS diet_entries_created_by_fkey;
ALTER TABLE public.diet_entries 
  ADD CONSTRAINT diet_entries_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- families
ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_created_by_fkey;
ALTER TABLE public.families 
  ADD CONSTRAINT families_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- invite_codes
ALTER TABLE public.invite_codes DROP CONSTRAINT IF EXISTS invite_codes_created_by_fkey;
ALTER TABLE public.invite_codes 
  ADD CONSTRAINT invite_codes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.invite_codes DROP CONSTRAINT IF EXISTS invite_codes_used_by_fkey;
ALTER TABLE public.invite_codes 
  ADD CONSTRAINT invite_codes_used_by_fkey 
  FOREIGN KEY (used_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- key_information
ALTER TABLE public.key_information DROP CONSTRAINT IF EXISTS key_information_last_updated_by_fkey;
ALTER TABLE public.key_information 
  ADD CONSTRAINT key_information_last_updated_by_fkey 
  FOREIGN KEY (last_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- leave_requests
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_approved_by_fkey;
ALTER TABLE public.leave_requests 
  ADD CONSTRAINT leave_requests_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
ALTER TABLE public.leave_requests 
  ADD CONSTRAINT leave_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- mar_doses
ALTER TABLE public.mar_doses DROP CONSTRAINT IF EXISTS mar_doses_given_by_fkey;
ALTER TABLE public.mar_doses 
  ADD CONSTRAINT mar_doses_given_by_fkey 
  FOREIGN KEY (given_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- mar_history
ALTER TABLE public.mar_history DROP CONSTRAINT IF EXISTS mar_history_changed_by_fkey;
ALTER TABLE public.mar_history 
  ADD CONSTRAINT mar_history_changed_by_fkey 
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- medication_administrations
ALTER TABLE public.medication_administrations DROP CONSTRAINT IF EXISTS medication_administrations_carer_id_fkey;
ALTER TABLE public.medication_administrations 
  ADD CONSTRAINT medication_administrations_carer_id_fkey 
  FOREIGN KEY (carer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.medication_administrations DROP CONSTRAINT IF EXISTS medication_administrations_created_by_fkey;
ALTER TABLE public.medication_administrations 
  ADD CONSTRAINT medication_administrations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- money_records
ALTER TABLE public.money_records DROP CONSTRAINT IF EXISTS money_records_created_by_fkey;
ALTER TABLE public.money_records 
  ADD CONSTRAINT money_records_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- placeholder_carers
ALTER TABLE public.placeholder_carers DROP CONSTRAINT IF EXISTS placeholder_carers_created_by_fkey;
ALTER TABLE public.placeholder_carers 
  ADD CONSTRAINT placeholder_carers_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.placeholder_carers DROP CONSTRAINT IF EXISTS placeholder_carers_linked_user_id_fkey;
ALTER TABLE public.placeholder_carers 
  ADD CONSTRAINT placeholder_carers_linked_user_id_fkey 
  FOREIGN KEY (linked_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- risk_assessments
ALTER TABLE public.risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_approved_by_fkey;
ALTER TABLE public.risk_assessments 
  ADD CONSTRAINT risk_assessments_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_created_by_fkey;
ALTER TABLE public.risk_assessments 
  ADD CONSTRAINT risk_assessments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_reviewed_by_fkey;
ALTER TABLE public.risk_assessments 
  ADD CONSTRAINT risk_assessments_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- role_change_requests
ALTER TABLE public.role_change_requests DROP CONSTRAINT IF EXISTS role_change_requests_reviewed_by_fkey;
ALTER TABLE public.role_change_requests 
  ADD CONSTRAINT role_change_requests_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.role_change_requests DROP CONSTRAINT IF EXISTS role_change_requests_user_id_fkey;
ALTER TABLE public.role_change_requests 
  ADD CONSTRAINT role_change_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- shift_assignments
ALTER TABLE public.shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_carer_id_fkey;
ALTER TABLE public.shift_assignments 
  ADD CONSTRAINT shift_assignments_carer_id_fkey 
  FOREIGN KEY (carer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- shift_change_requests
ALTER TABLE public.shift_change_requests DROP CONSTRAINT IF EXISTS shift_change_requests_applied_by_fkey;
ALTER TABLE public.shift_change_requests 
  ADD CONSTRAINT shift_change_requests_applied_by_fkey 
  FOREIGN KEY (applied_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.shift_change_requests DROP CONSTRAINT IF EXISTS shift_change_requests_requested_by_fkey;
ALTER TABLE public.shift_change_requests 
  ADD CONSTRAINT shift_change_requests_requested_by_fkey 
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.shift_change_requests DROP CONSTRAINT IF EXISTS shift_change_requests_reverted_by_fkey;
ALTER TABLE public.shift_change_requests 
  ADD CONSTRAINT shift_change_requests_reverted_by_fkey 
  FOREIGN KEY (reverted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.shift_change_requests DROP CONSTRAINT IF EXISTS shift_change_requests_reviewed_by_fkey;
ALTER TABLE public.shift_change_requests 
  ADD CONSTRAINT shift_change_requests_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- shift_instances
ALTER TABLE public.shift_instances DROP CONSTRAINT IF EXISTS shift_instances_completed_by_fkey;
ALTER TABLE public.shift_instances 
  ADD CONSTRAINT shift_instances_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- time_entries
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_approved_by_fkey;
ALTER TABLE public.time_entries 
  ADD CONSTRAINT time_entries_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_user_id_fkey;
ALTER TABLE public.time_entries 
  ADD CONSTRAINT time_entries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- timesheet_exports
ALTER TABLE public.timesheet_exports DROP CONSTRAINT IF EXISTS timesheet_exports_carer_id_fkey;
ALTER TABLE public.timesheet_exports 
  ADD CONSTRAINT timesheet_exports_carer_id_fkey 
  FOREIGN KEY (carer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.timesheet_exports DROP CONSTRAINT IF EXISTS timesheet_exports_exported_by_fkey;
ALTER TABLE public.timesheet_exports 
  ADD CONSTRAINT timesheet_exports_exported_by_fkey 
  FOREIGN KEY (exported_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- conversation_participants
ALTER TABLE public.conversation_participants DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
ALTER TABLE public.conversation_participants 
  ADD CONSTRAINT conversation_participants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;