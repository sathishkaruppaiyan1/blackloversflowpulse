
-- Create users profile table for additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create WooCommerce settings table
CREATE TABLE IF NOT EXISTS public.woocommerce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create Interakt settings table
CREATE TABLE IF NOT EXISTS public.interakt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT DEFAULT 'https://api.interakt.ai' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  woo_order_id TEXT,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  total DECIMAL(10,2) DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'processing' NOT NULL,
  items INTEGER DEFAULT 0 NOT NULL,
  shipping_address TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  reseller_name TEXT,
  reseller_number TEXT,
  tracking_number TEXT,
  carrier TEXT,
  printed_at TIMESTAMP WITH TIME ZONE,
  packed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, woo_order_id)
);

-- Create order stage movements table
CREATE TABLE IF NOT EXISTS public.order_stage_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  notes TEXT,
  moved_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create completed orders table
CREATE TABLE IF NOT EXISTS public.completed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_order_id TEXT NOT NULL,
  order_data JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interakt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stage_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for woocommerce_settings
CREATE POLICY "Users can view their own woocommerce settings" ON public.woocommerce_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own woocommerce settings" ON public.woocommerce_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own woocommerce settings" ON public.woocommerce_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for interakt_settings
CREATE POLICY "Users can view their own interakt settings" ON public.interakt_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own interakt settings" ON public.interakt_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interakt settings" ON public.interakt_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON public.orders
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for order_stage_movements
CREATE POLICY "Users can view their own order movements" ON public.order_stage_movements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own order movements" ON public.order_stage_movements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for completed_orders
CREATE POLICY "Users can view their own completed orders" ON public.completed_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own completed orders" ON public.completed_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own completed orders" ON public.completed_orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own completed orders" ON public.completed_orders
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_woo_order_id ON public.orders(woo_order_id);
CREATE INDEX IF NOT EXISTS idx_order_movements_order_id ON public.order_stage_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_completed_orders_user_id ON public.completed_orders(user_id);
