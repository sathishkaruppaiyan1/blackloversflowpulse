
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WooCommerceSettings {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}

const WooCommerceSettings = () => {
  const [settings, setSettings] = useState<WooCommerceSettings>({
    store_url: 'https://resellers.blacklovers.in/',
    consumer_key: 'ck_c58d5b4fc9361f3c1ab2cf90c277daee29f8a417',
    consumer_secret: 'cs_9c8b5e8ee7a9ee9d9e3aa426159574ec97cc8e0d'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('woocommerce_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings({
          store_url: data.store_url,
          consumer_key: data.consumer_key,
          consumer_secret: data.consumer_secret
        });
      }
    } catch (error: any) {
      toast.error('Failed to load WooCommerce settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('woocommerce_settings')
        .upsert({
          user_id: user.id,
          store_url: settings.store_url.trim(),
          consumer_key: settings.consumer_key.trim(),
          consumer_secret: settings.consumer_secret.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('WooCommerce settings saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) return;

    setTesting(true);
    try {
      console.log('Testing WooCommerce connection...');
      const { data, error } = await supabase.functions.invoke('fetch-woocommerce-orders', {
        body: {
          store_url: settings.store_url,
          consumer_key: settings.consumer_key,
          consumer_secret: settings.consumer_secret
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Connection test failed: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('WooCommerce API error:', data.error);
        toast.error(`WooCommerce API Error: ${data.error}`);
        if (data.suggestions?.length > 0) {
          console.log('Suggestions:', data.suggestions);
        }
        return;
      }

      if (data?.orders) {
        toast.success(`Connection successful! Found ${data.orders.length} orders`);
        console.log('Test successful:', data);
      } else {
        toast.info('Connection successful but no orders found');
      }
    } catch (error: any) {
      console.error('Unexpected error during connection test:', error);
      toast.error(`Unexpected error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: keyof WooCommerceSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WooCommerce Integration</CardTitle>
        <CardDescription>
          Configure your WooCommerce store connection to fetch orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="store_url">Store URL</Label>
          <Input
            id="store_url"
            type="url"
            placeholder="https://yourstore.com"
            value={settings.store_url}
            onChange={(e) => handleInputChange('store_url', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="consumer_key">Consumer Key</Label>
          <Input
            id="consumer_key"
            type="text"
            placeholder="ck_..."
            value={settings.consumer_key}
            onChange={(e) => handleInputChange('consumer_key', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="consumer_secret">Consumer Secret</Label>
          <Input
            id="consumer_secret"
            type="password"
            placeholder="cs_..."
            value={settings.consumer_secret}
            onChange={(e) => handleInputChange('consumer_secret', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={saveSettings} 
            disabled={saving || !settings.store_url || !settings.consumer_key || !settings.consumer_secret}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button 
            onClick={testConnection}
            disabled={testing || !settings.store_url || !settings.consumer_key || !settings.consumer_secret}
            variant="outline"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WooCommerceSettings;
