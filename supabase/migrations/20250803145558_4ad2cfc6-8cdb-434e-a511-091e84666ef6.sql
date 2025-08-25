
-- Add line_items column to orders table to store product details
ALTER TABLE public.orders ADD COLUMN line_items JSONB DEFAULT '[]'::jsonb;

-- Add reseller_name and reseller_number columns to orders table
ALTER TABLE public.orders ADD COLUMN reseller_name TEXT;
ALTER TABLE public.orders ADD COLUMN reseller_number TEXT;
