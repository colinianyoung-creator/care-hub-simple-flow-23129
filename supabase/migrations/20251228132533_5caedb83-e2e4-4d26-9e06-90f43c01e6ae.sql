-- Create risk_assessments table for AI-generated, editable risk assessments
CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Input fields
  activity TEXT NOT NULL,
  setting TEXT NOT NULL,
  main_hazards TEXT NOT NULL,
  location TEXT NOT NULL,
  
  -- Generated/edited assessment content
  title TEXT NOT NULL,
  assessment_content TEXT NOT NULL,
  residual_risk_level TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high')),
  
  -- Review tracking
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  next_review_date DATE,
  
  -- Approval workflow
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_family_member function
CREATE POLICY "Family members can view risk assessments" 
  ON public.risk_assessments FOR SELECT 
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create risk assessments" 
  ON public.risk_assessments FOR INSERT 
  WITH CHECK (is_family_member(auth.uid(), family_id) AND created_by = auth.uid());

CREATE POLICY "Family members can update risk assessments" 
  ON public.risk_assessments FOR UPDATE 
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can delete risk assessments" 
  ON public.risk_assessments FOR DELETE 
  USING (can_manage_family(auth.uid(), family_id));

-- Create updated_at trigger
CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();