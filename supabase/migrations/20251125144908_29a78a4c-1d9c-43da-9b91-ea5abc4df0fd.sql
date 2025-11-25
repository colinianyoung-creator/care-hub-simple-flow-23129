-- Add new_shift_type column to shift_change_requests table
ALTER TABLE shift_change_requests 
ADD COLUMN new_shift_type text DEFAULT 'basic';