-- Add missing fields to couriers table
ALTER TABLE public.couriers 
ADD COLUMN IF NOT EXISTS pattern_prefix TEXT,
ADD COLUMN IF NOT EXISTS pattern_length INTEGER,
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN public.couriers.pattern_prefix IS 'Starting digits/characters for tracking number auto-detection';
COMMENT ON COLUMN public.couriers.pattern_length IS 'Expected total length of tracking number';
COMMENT ON COLUMN public.couriers.api_key IS 'API key for automatic tracking detail fetching';

