-- Enable Row Level Security on care_notes table
ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Family members can view care notes for their families
CREATE POLICY "Family members can view care notes" 
ON public.care_notes 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

-- Policy: Family members can create care notes for their families
CREATE POLICY "Family members can create care notes" 
ON public.care_notes 
FOR INSERT 
WITH CHECK (is_member(auth.uid(), family_id) AND author_id = auth.uid());

-- Policy: Authors and family admins can update care notes
CREATE POLICY "Authors and admins can update care notes" 
ON public.care_notes 
FOR UPDATE 
USING (
  (author_id = auth.uid()) OR 
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);

-- Policy: Authors and family admins can delete care notes
CREATE POLICY "Authors and admins can delete care notes" 
ON public.care_notes 
FOR DELETE 
USING (
  (author_id = auth.uid()) OR 
  (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
  (has_family_role(auth.uid(), family_id, 'disabled_person'))
);