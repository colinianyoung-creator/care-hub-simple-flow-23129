-- Fix foreign key constraints to allow user deletion
-- Change from NO ACTION to ON DELETE SET NULL for audit/reference columns

-- 1. attendance_exceptions.resolved_by
ALTER TABLE public.attendance_exceptions
DROP CONSTRAINT IF EXISTS attendance_exceptions_resolved_by_fkey;

ALTER TABLE public.attendance_exceptions
ADD CONSTRAINT attendance_exceptions_resolved_by_fkey
FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. key_information.last_updated_by
ALTER TABLE public.key_information
DROP CONSTRAINT IF EXISTS key_information_last_updated_by_fkey;

ALTER TABLE public.key_information
ADD CONSTRAINT key_information_last_updated_by_fkey
FOREIGN KEY (last_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. mar_doses.given_by
ALTER TABLE public.mar_doses
DROP CONSTRAINT IF EXISTS mar_doses_given_by_fkey;

ALTER TABLE public.mar_doses
ADD CONSTRAINT mar_doses_given_by_fkey
FOREIGN KEY (given_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. mar_history.changed_by
ALTER TABLE public.mar_history
DROP CONSTRAINT IF EXISTS mar_history_changed_by_fkey;

ALTER TABLE public.mar_history
ADD CONSTRAINT mar_history_changed_by_fkey
FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. placeholder_carers.linked_user_id
ALTER TABLE public.placeholder_carers
DROP CONSTRAINT IF EXISTS placeholder_carers_linked_user_id_fkey;

ALTER TABLE public.placeholder_carers
ADD CONSTRAINT placeholder_carers_linked_user_id_fkey
FOREIGN KEY (linked_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. placeholder_carers.created_by
ALTER TABLE public.placeholder_carers
DROP CONSTRAINT IF EXISTS placeholder_carers_created_by_fkey;

ALTER TABLE public.placeholder_carers
ADD CONSTRAINT placeholder_carers_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7. risk_assessments.approved_by
ALTER TABLE public.risk_assessments
DROP CONSTRAINT IF EXISTS risk_assessments_approved_by_fkey;

ALTER TABLE public.risk_assessments
ADD CONSTRAINT risk_assessments_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8. risk_assessments.created_by
ALTER TABLE public.risk_assessments
DROP CONSTRAINT IF EXISTS risk_assessments_created_by_fkey;

ALTER TABLE public.risk_assessments
ADD CONSTRAINT risk_assessments_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 9. risk_assessments.reviewed_by
ALTER TABLE public.risk_assessments
DROP CONSTRAINT IF EXISTS risk_assessments_reviewed_by_fkey;

ALTER TABLE public.risk_assessments
ADD CONSTRAINT risk_assessments_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 10. shift_change_requests.applied_by
ALTER TABLE public.shift_change_requests
DROP CONSTRAINT IF EXISTS shift_change_requests_applied_by_fkey;

ALTER TABLE public.shift_change_requests
ADD CONSTRAINT shift_change_requests_applied_by_fkey
FOREIGN KEY (applied_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 11. shift_change_requests.reverted_by
ALTER TABLE public.shift_change_requests
DROP CONSTRAINT IF EXISTS shift_change_requests_reverted_by_fkey;

ALTER TABLE public.shift_change_requests
ADD CONSTRAINT shift_change_requests_reverted_by_fkey
FOREIGN KEY (reverted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 12. shift_change_requests.reviewed_by
ALTER TABLE public.shift_change_requests
DROP CONSTRAINT IF EXISTS shift_change_requests_reviewed_by_fkey;

ALTER TABLE public.shift_change_requests
ADD CONSTRAINT shift_change_requests_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 13. shift_change_requests.requested_by
ALTER TABLE public.shift_change_requests
DROP CONSTRAINT IF EXISTS shift_change_requests_requested_by_fkey;

ALTER TABLE public.shift_change_requests
ADD CONSTRAINT shift_change_requests_requested_by_fkey
FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 14. shift_instances.completed_by
ALTER TABLE public.shift_instances
DROP CONSTRAINT IF EXISTS shift_instances_completed_by_fkey;

ALTER TABLE public.shift_instances
ADD CONSTRAINT shift_instances_completed_by_fkey
FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 15. time_entries.approved_by
ALTER TABLE public.time_entries
DROP CONSTRAINT IF EXISTS time_entries_approved_by_fkey;

ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 16. timesheet_exports.exported_by
ALTER TABLE public.timesheet_exports
DROP CONSTRAINT IF EXISTS timesheet_exports_exported_by_fkey;

ALTER TABLE public.timesheet_exports
ADD CONSTRAINT timesheet_exports_exported_by_fkey
FOREIGN KEY (exported_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 17. conversation_participants.user_id - add missing FK with CASCADE
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;