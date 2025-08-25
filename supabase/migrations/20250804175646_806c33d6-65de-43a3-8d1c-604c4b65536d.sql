
-- Create a table to store completed order snapshots
CREATE TABLE public.completed_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_order_id UUID NOT NULL,
  order_data JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.completed_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own completed orders
CREATE POLICY "Users can view their own completed orders" 
  ON public.completed_orders 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own completed orders
CREATE POLICY "Users can create their own completed orders" 
  ON public.completed_orders 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own completed orders
CREATE POLICY "Users can update their own completed orders" 
  ON public.completed_orders 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own completed orders
CREATE POLICY "Users can delete their own completed orders" 
  ON public.completed_orders 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_completed_orders_user_id ON public.completed_orders(user_id);
CREATE INDEX idx_completed_orders_original_order_id ON public.completed_orders(original_order_id);
