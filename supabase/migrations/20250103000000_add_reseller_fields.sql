-- Add reseller fields to orders table
ALTER TABLE public.orders 
ADD COLUMN reseller_name TEXT,
ADD COLUMN reseller_number TEXT,
ADD COLUMN line_items JSONB;

-- Add index for better performance on reseller queries
CREATE INDEX idx_orders_reseller_name ON public.orders(reseller_name);
CREATE INDEX idx_orders_reseller_number ON public.orders(reseller_number); 