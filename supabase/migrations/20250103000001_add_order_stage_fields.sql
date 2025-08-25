-- Add stage management fields to orders table
ALTER TABLE public.orders 
ADD COLUMN stage TEXT DEFAULT 'processing' CHECK (stage IN ('processing', 'packing', 'packed', 'shipped', 'delivered')),
ADD COLUMN printed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN packed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN tracking_number TEXT,
ADD COLUMN carrier TEXT;

-- Add indexes for better performance on stage queries
CREATE INDEX idx_orders_stage ON public.orders(stage);
CREATE INDEX idx_orders_tracking_number ON public.orders(tracking_number);
CREATE INDEX idx_orders_carrier ON public.orders(carrier);

-- Update existing orders to have default stage
UPDATE public.orders SET stage = 'processing' WHERE stage IS NULL;