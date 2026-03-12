-- Update company_settings table check constraint for default_label_format
-- First drop the existing constraint if it exists (it might have a default name or a custom one)
-- The original migration (20250825031246) created it as:
-- default_label_format TEXT DEFAULT 'A4' CHECK (default_label_format IN ('A4', 'A5'))

DO $$
BEGIN
    ALTER TABLE public.company_settings 
    DROP CONSTRAINT IF EXISTS company_settings_default_label_format_check;
    
    ALTER TABLE public.company_settings 
    ADD CONSTRAINT company_settings_default_label_format_check 
    CHECK (default_label_format IN ('A4', 'A5', 'thermal'));
END $$;
