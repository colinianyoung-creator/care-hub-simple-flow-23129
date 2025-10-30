-- 1. Add is_archived to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 2. Add is_archived to money_records
ALTER TABLE money_records 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 3. Create key_information table
CREATE TABLE IF NOT EXISTS key_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  medical_history text,
  house_details text,
  car_policies text,
  additional_info text,
  emergency_contacts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_updated_by uuid REFERENCES profiles(id),
  UNIQUE(family_id)
);

-- RLS for key_information
ALTER TABLE key_information ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view key information"
ON key_information FOR SELECT
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Admins can manage key information"
ON key_information FOR ALL
USING (can_manage_family(auth.uid(), family_id));

-- 4. Create shift_change_requests table
CREATE TABLE IF NOT EXISTS shift_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  time_entry_id uuid NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  new_start_time timestamptz NOT NULL,
  new_end_time timestamptz NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shift_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view change requests"
ON shift_change_requests FOR SELECT
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Carers can create change requests"
ON shift_change_requests FOR INSERT
WITH CHECK (requested_by = auth.uid() AND is_family_member(auth.uid(), family_id));

CREATE POLICY "Admins can manage change requests"
ON shift_change_requests FOR ALL
USING (can_manage_family(auth.uid(), family_id));

-- Add updated_at trigger
CREATE TRIGGER update_key_information_updated_at
BEFORE UPDATE ON key_information
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_change_requests_updated_at
BEFORE UPDATE ON shift_change_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();