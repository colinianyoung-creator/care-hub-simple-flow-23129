-- Create timesheet templates table
CREATE TABLE public.timesheet_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'xlsx', 'pdf')),
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timesheet template mappings table
CREATE TABLE public.timesheet_template_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.timesheet_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  template_location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timesheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_template_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheet_templates
CREATE POLICY "Family members can view templates" 
ON public.timesheet_templates 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Admins can manage templates" 
ON public.timesheet_templates 
FOR ALL 
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'))
WITH CHECK (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- RLS Policies for timesheet_template_mappings
CREATE POLICY "Family members can view mappings" 
ON public.timesheet_template_mappings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.timesheet_templates tt 
  WHERE tt.id = template_id AND is_member(auth.uid(), tt.family_id)
));

CREATE POLICY "Admins can manage mappings" 
ON public.timesheet_template_mappings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.timesheet_templates tt 
  WHERE tt.id = template_id AND (
    has_family_role(auth.uid(), tt.family_id, 'family_admin') OR 
    has_family_role(auth.uid(), tt.family_id, 'disabled_person')
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.timesheet_templates tt 
  WHERE tt.id = template_id AND (
    has_family_role(auth.uid(), tt.family_id, 'family_admin') OR 
    has_family_role(auth.uid(), tt.family_id, 'disabled_person')
  )
));

-- Add updated_at trigger for templates
CREATE TRIGGER update_timesheet_templates_updated_at
BEFORE UPDATE ON public.timesheet_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();