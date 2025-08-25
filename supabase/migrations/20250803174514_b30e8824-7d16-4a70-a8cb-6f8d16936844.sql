
-- Create table to track order stage movements
CREATE TABLE public.order_stage_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  moved_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to orders table
ALTER TABLE public.order_stage_movements 
ADD CONSTRAINT fk_order_stage_movements_order_id 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.order_stage_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own order stage movements" 
  ON public.order_stage_movements 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own order stage movements" 
  ON public.order_stage_movements 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own order stage movements" 
  ON public.order_stage_movements 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own order stage movements" 
  ON public.order_stage_movements 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_order_stage_movements_order_id ON public.order_stage_movements(order_id);
CREATE INDEX idx_order_stage_movements_user_id ON public.order_stage_movements(user_id);
CREATE INDEX idx_order_stage_movements_stage ON public.order_stage_movements(to_stage);
