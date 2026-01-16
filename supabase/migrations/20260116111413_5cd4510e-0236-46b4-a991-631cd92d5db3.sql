-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_note_id UUID NOT NULL REFERENCES public.care_notes(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  
  -- Incident details
  incident_type TEXT NOT NULL CHECK (incident_type IN ('fall', 'injury', 'medication_error', 'behavioural', 'safeguarding', 'other')),
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT,
  
  -- People involved
  people_involved UUID[],
  witnesses TEXT,
  
  -- Description & Actions
  description TEXT NOT NULL,
  immediate_actions TEXT,
  
  -- Medical attention
  medical_attention_required BOOLEAN DEFAULT false,
  medical_attention_details TEXT,
  
  -- Outcome & Follow-up
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_details TEXT,
  
  -- Reporting
  reported_to TEXT[],
  reported_to_other TEXT,
  
  -- Auto-filled metadata
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_incident_reports_care_note_id ON public.incident_reports(care_note_id);
CREATE INDEX idx_incident_reports_family_id ON public.incident_reports(family_id);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (consistent with care_notes)
CREATE POLICY "Family members can view incident reports"
  ON public.incident_reports FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create incident reports"
  ON public.incident_reports FOR INSERT
  WITH CHECK (
    is_family_member(auth.uid(), family_id) 
    AND reported_by = auth.uid()
  );

CREATE POLICY "Authors and admins can update incident reports"
  ON public.incident_reports FOR UPDATE
  USING (
    reported_by = auth.uid() 
    OR can_manage_family(auth.uid(), family_id)
  );

CREATE POLICY "Admins can delete incident reports"
  ON public.incident_reports FOR DELETE
  USING (can_manage_family(auth.uid(), family_id));

-- Add trigger for updated_at
CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();