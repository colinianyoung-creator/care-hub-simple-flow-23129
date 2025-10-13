-- Create role change requests table
CREATE TABLE public.role_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  family_id uuid NOT NULL,
  current_role app_role NOT NULL,
  requested_role app_role NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin change requests table
CREATE TABLE public.admin_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  family_id uuid NOT NULL,
  request_type text NOT NULL, -- 'transfer_admin' or 'delete_account'
  target_user_id uuid, -- for admin transfer
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create network delete requests table
CREATE TABLE public.network_delete_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  family_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  votes_needed integer NOT NULL DEFAULT 0,
  votes_received integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create network delete votes table
CREATE TABLE public.network_delete_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  vote boolean NOT NULL, -- true for approve, false for deny
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(request_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_delete_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_change_requests
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

-- RLS policies for admin_change_requests
CREATE POLICY "Users can create admin change requests" 
ON public.admin_change_requests 
FOR INSERT 
WITH CHECK (requester_id = auth.uid() AND is_member(auth.uid(), family_id));

CREATE POLICY "Family members can view admin change requests" 
ON public.admin_change_requests 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Admins can update admin change requests" 
ON public.admin_change_requests 
FOR UPDATE 
USING (has_family_role(auth.uid(), family_id, 'family_admin'::app_role) OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role));

-- RLS policies for network_delete_requests
CREATE POLICY "Admins can create network delete requests" 
ON public.network_delete_requests 
FOR INSERT 
WITH CHECK (requester_id = auth.uid() AND (has_family_role(auth.uid(), family_id, 'family_admin'::app_role) OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role)));

CREATE POLICY "Family members can view network delete requests" 
ON public.network_delete_requests 
FOR SELECT 
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Admins can update network delete requests" 
ON public.network_delete_requests 
FOR UPDATE 
USING (has_family_role(auth.uid(), family_id, 'family_admin'::app_role) OR has_family_role(auth.uid(), family_id, 'disabled_person'::app_role));

-- RLS policies for network_delete_votes
CREATE POLICY "Users can create their own votes" 
ON public.network_delete_votes 
FOR INSERT 
WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Users can view votes for their family requests" 
ON public.network_delete_votes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM network_delete_requests ndr 
  WHERE ndr.id = request_id AND is_member(auth.uid(), ndr.family_id)
));

-- Create triggers for updated_at
CREATE TRIGGER update_role_change_requests_updated_at
BEFORE UPDATE ON public.role_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_change_requests_updated_at
BEFORE UPDATE ON public.admin_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();