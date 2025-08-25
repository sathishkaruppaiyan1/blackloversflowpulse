-- Create interakt_settings table
CREATE TABLE IF NOT EXISTS interakt_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT 'https://api.interakt.ai',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one settings per user
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE interakt_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own settings
CREATE POLICY "Users can manage their own Interakt settings" ON interakt_settings
    FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interakt_settings_updated_at BEFORE UPDATE ON interakt_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();