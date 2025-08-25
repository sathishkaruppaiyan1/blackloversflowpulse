
-- Create company_settings table for storing company information
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  default_label_format TEXT DEFAULT 'A4',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create couriers table for storing courier information
CREATE TABLE public.couriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tracking_url TEXT,
  example_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for managing user permissions
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_settings
CREATE POLICY "Users can view their own company settings" 
  ON public.company_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company settings" 
  ON public.company_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" 
  ON public.company_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company settings" 
  ON public.company_settings 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for couriers
CREATE POLICY "Users can view their own couriers" 
  ON public.couriers 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own couriers" 
  ON public.couriers 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own couriers" 
  ON public.couriers 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own couriers" 
  ON public.couriers 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create user roles" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update user roles" 
  ON public.user_roles 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete user roles" 
  ON public.user_roles 
  FOR DELETE 
  TO authenticated
  USING (true);
