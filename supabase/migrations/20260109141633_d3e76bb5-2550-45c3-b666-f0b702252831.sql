-- Create leave_cancellation_requests table for handling approved leave cancellations with cover conflicts
CREATE TABLE public.leave_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reason TEXT,
  conflict_shift_ids UUID[] DEFAULT '{}',
  conflict_details JSONB,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view cancellation requests in their families
CREATE POLICY "Users can view cancellation requests in their families"
  ON public.leave_cancellation_requests FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

-- Users can view their own cancellation requests
CREATE POLICY "Users can view their own cancellation requests"
  ON public.leave_cancellation_requests FOR SELECT
  USING (requested_by = auth.uid());

-- Carers can create cancellation requests
CREATE POLICY "Carers can create cancellation requests"
  ON public.leave_cancellation_requests FOR INSERT
  WITH CHECK (
    is_family_member(auth.uid(), family_id)
    AND requested_by = auth.uid()
  );

-- Admins can update cancellation requests
CREATE POLICY "Admins can update cancellation requests"
  ON public.leave_cancellation_requests FOR UPDATE
  USING (can_manage_family(auth.uid(), family_id));

-- Admins can delete cancellation requests
CREATE POLICY "Admins can delete cancellation requests"
  ON public.leave_cancellation_requests FOR DELETE
  USING (can_manage_family(auth.uid(), family_id));

-- Create updated_at trigger
CREATE TRIGGER update_leave_cancellation_requests_updated_at
  BEFORE UPDATE ON public.leave_cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();