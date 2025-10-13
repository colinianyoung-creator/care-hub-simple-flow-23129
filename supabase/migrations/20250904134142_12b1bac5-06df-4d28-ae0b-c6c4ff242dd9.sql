-- Enable RLS on the new table
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for role_change_requests
CREATE POLICY "Users can create their own role change requests" 
ON public.role_change_requests 
FOR INSERT 
WITH CHECK (requester_id = auth.uid() AND is_member(auth.uid(), family_id));

CREATE POLICY "Family members can view role change requests" 
ON public.role_change_requests 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Admins can update role change requests" 
ON public.role_change_requests 
FOR UPDATE 
USING (has_family_role(auth.uid(), family_id, 'family_admin'::app_role) OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_role_change_requests_updated_at
BEFORE UPDATE ON public.role_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();