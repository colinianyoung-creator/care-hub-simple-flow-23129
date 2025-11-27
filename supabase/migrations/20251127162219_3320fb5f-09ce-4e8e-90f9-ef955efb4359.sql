-- 1. Add two_factor_enabled column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;

-- 2. Add DELETE RLS policy for leave_requests (carers can delete their pending requests)
CREATE POLICY "Users can delete their pending leave requests"
ON public.leave_requests
FOR DELETE
USING ((user_id = auth.uid()) AND (status = 'pending'::leave_status));