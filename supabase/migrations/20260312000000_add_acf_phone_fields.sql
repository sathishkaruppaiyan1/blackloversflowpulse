-- Add ACF custom fields: alternate_phone and whatsapp_number to orders table
-- These fields are fetched from WooCommerce order meta_data during sync

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
