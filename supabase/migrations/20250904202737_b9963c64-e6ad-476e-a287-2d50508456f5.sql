-- Update care_notes table to support structured notes
ALTER TABLE public.care_notes 
ADD COLUMN activity_support TEXT,
ADD COLUMN activity_tags TEXT[],
ADD COLUMN observations TEXT,
ADD COLUMN outcome_response TEXT,
ADD COLUMN next_steps TEXT,
ADD COLUMN mood TEXT,
ADD COLUMN eating_drinking TEXT,
ADD COLUMN eating_drinking_notes TEXT,
ADD COLUMN bathroom_usage TEXT,
ADD COLUMN incidents TEXT,
ADD COLUMN is_incident BOOLEAN DEFAULT false;

-- Create key_information table
CREATE TABLE public.key_information (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  care_recipient_id UUID,
  medical_history TEXT,
  house_details TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  car_policies TEXT,
  additional_info TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on key_information
ALTER TABLE public.key_information ENABLE ROW LEVEL SECURITY;

-- Create policies for key_information
CREATE POLICY "Admins can manage key information"
ON public.key_information
FOR ALL
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'))
WITH CHECK (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

CREATE POLICY "Family members can view key information"
ON public.key_information
FOR SELECT
USING (is_member(auth.uid(), family_id));

-- Create network_delete_requests table
CREATE TABLE public.network_delete_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  required_votes INTEGER NOT NULL DEFAULT 2,
  current_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS on network_delete_requests
ALTER TABLE public.network_delete_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for network_delete_requests
CREATE POLICY "Family members can view network delete requests"
ON public.network_delete_requests
FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Users can create network delete requests"
ON public.network_delete_requests
FOR INSERT
WITH CHECK (is_member(auth.uid(), family_id) AND requester_id = auth.uid());

CREATE POLICY "Admins can update network delete requests"
ON public.network_delete_requests
FOR UPDATE
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Create network_delete_votes table
CREATE TABLE public.network_delete_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  voter_id UUID NOT NULL,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, voter_id)
);

-- Enable RLS on network_delete_votes
ALTER TABLE public.network_delete_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for network_delete_votes
CREATE POLICY "Family members can view network delete votes"
ON public.network_delete_votes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.network_delete_requests ndr 
  WHERE ndr.id = request_id AND is_member(auth.uid(), ndr.family_id)
));

CREATE POLICY "Users can create their own votes"
ON public.network_delete_votes
FOR INSERT
WITH CHECK (voter_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.network_delete_requests ndr 
  WHERE ndr.id = request_id AND is_member(auth.uid(), ndr.family_id)
));

-- Create admin_change_requests table
CREATE TABLE public.admin_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'promote_to_admin', 'remove_from_admin'
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS on admin_change_requests
ALTER TABLE public.admin_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_change_requests
CREATE POLICY "Family members can view admin change requests"
ON public.admin_change_requests
FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Users can create admin change requests"
ON public.admin_change_requests
FOR INSERT
WITH CHECK (is_member(auth.uid(), family_id) AND requester_id = auth.uid());

CREATE POLICY "Admins can update admin change requests"
ON public.admin_change_requests
FOR UPDATE
USING (has_family_role(auth.uid(), family_id, 'family_admin') OR has_family_role(auth.uid(), family_id, 'disabled_person'));

-- Add updated_at trigger for key_information
CREATE TRIGGER update_key_information_updated_at
BEFORE UPDATE ON public.key_information
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();