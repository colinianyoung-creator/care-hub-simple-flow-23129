-- Add unique constraint to prevent duplicate shift instances for the same assignment and date
ALTER TABLE shift_instances 
ADD CONSTRAINT shift_instances_assignment_date_unique 
UNIQUE (shift_assignment_id, scheduled_date);