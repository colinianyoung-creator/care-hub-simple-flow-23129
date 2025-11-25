-- Allow carers to delete their own pending shift change requests
CREATE POLICY "Carers can delete their own pending requests"
ON public.shift_change_requests
FOR DELETE
USING (
  requested_by = auth.uid() 
  AND status = 'pending'
);