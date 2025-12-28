-- Make timesheet-signatures bucket private to protect sensitive biometric data
UPDATE storage.buckets 
SET public = false 
WHERE id = 'timesheet-signatures';