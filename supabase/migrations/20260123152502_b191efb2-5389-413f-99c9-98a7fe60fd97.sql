-- Add bundle_id column to shift_change_requests for grouping date range requests
ALTER TABLE public.shift_change_requests
ADD COLUMN IF NOT EXISTS bundle_id UUID DEFAULT NULL;

-- Add index for efficient bundle queries
CREATE INDEX IF NOT EXISTS idx_shift_change_requests_bundle_id ON public.shift_change_requests(bundle_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.shift_change_requests.bundle_id IS 'Groups multiple shift change requests that were submitted together as a date range';