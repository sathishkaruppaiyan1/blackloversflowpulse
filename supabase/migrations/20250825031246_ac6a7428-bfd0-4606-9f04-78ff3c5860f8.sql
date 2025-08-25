
-- Create company_settings table for general address and label settings
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  default_label_format TEXT DEFAULT 'A4' CHECK (default_label_format IN ('A4', 'A5')),
  show_reseller_info BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create couriers table
CREATE TABLE public.couriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  tracking_url TEXT,
  example_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for staff management
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  assigned_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add RLS policies for company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

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

-- Add RLS policies for couriers
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

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

-- Add RLS policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can create user roles" 
  ON public.user_roles 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles" 
  ON public.user_roles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Insert default couriers
INSERT INTO public.couriers (user_id, name, tracking_url, example_number) VALUES
  (auth.uid(), 'Delhivery', 'https://www.delhivery.com/track/package/{tracking_number}', 'DH123456789'),
  (auth.uid(), 'Franch Express', 'https://franchexpress.com/courier-tracking/?awb={tracking_number}', 'FE123456789')
ON CONFLICT DO NOTHING;
