-- Add bypass_packing_stage field to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS bypass_packing_stage BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.company_settings.bypass_packing_stage IS 'When enabled, orders will automatically move to tracking stage (packed) after printing, bypassing the packing stage';

