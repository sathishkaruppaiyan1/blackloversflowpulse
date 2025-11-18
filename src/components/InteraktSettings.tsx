import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageCircle, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InteraktSettings {
  api_key: string;
  base_url: string;
  is_active: boolean;
}

const InteraktSettings = () => {
  const [settings, setSettings] = useState<InteraktSettings>({
    api_key: '',
    base_url: 'https://api.interakt.ai',
    is_active: true
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
        .from('interakt_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings({
          api_key: data.api_key || '',
          base_url: data.base_url || 'https://api.interakt.ai',
          is_active: data.is_active ?? true
        });
      }
    } catch (error: any) {
      toast.error('Failed to load Interakt settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    if (!settings.api_key.trim()) {
      toast.error('API Key is required');
      return;
    }



    setSaving(true);
    try {
      const { error } = await supabase
        .from('interakt_settings')
        .upsert({
          user_id: user.id,
          api_key: settings.api_key.trim(),
          base_url: settings.base_url.trim(),
          is_active: settings.is_active,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Interakt settings saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) return;

    if (!settings.api_key.trim()) {
      toast.error('Please enter API Key first');
      return;
    }

    setTesting(true);
    try {
      console.log('Testing Interakt connection...');
      const { data, error } = await supabase.functions.invoke('test-interakt-connection', {
        body: {
          api_key: settings.api_key,
          base_url: settings.base_url
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Connection test failed: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('Interakt API error:', data.error);
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error;
        toast.error(errorMessage, {
          description: data.suggestion || 'Please check your API key and try again.',
          duration: 5000
        });
        return;
      }

      if (data?.success) {
        const successMessage = data.note 
          ? `${data.message} - ${data.note}` 
          : data.message || 'Interakt connection successful!';
        toast.success(successMessage, {
          description: data.details || 'Your API credentials are working correctly.',
          duration: 5000
        });
        console.log('Test successful:', data);
      } else {
        toast.error('Unexpected response from Interakt API', {
          description: 'Please check the browser console for details.',
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during connection test:', error);
      toast.error(`Unexpected error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: keyof InteraktSettings, value: string | boolean) => {
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
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>Interakt WhatsApp Integration</CardTitle>
        </div>
        <CardDescription>
          Configure your Interakt API credentials to send WhatsApp tracking notifications to customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api_key">Interakt API Key</Label>
          <Input
            id="api_key"
            type="password"
            placeholder="Enter your Interakt API key"
            value={settings.api_key}
            onChange={(e) => handleInputChange('api_key', e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Get your API key from Interakt dashboard → Settings → API Configuration
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_url">Interakt Base URL</Label>
          <Input
            id="base_url"
            type="url"
            placeholder="https://api.interakt.ai"
            value={settings.base_url}
            onChange={(e) => handleInputChange('base_url', e.target.value)}
          />
        </div>



        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            checked={settings.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <Label htmlFor="is_active">Enable Interakt notifications</Label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button 
            onClick={testConnection}
            disabled={testing || !settings.api_key.trim()}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <TestTube className="h-4 w-4" />
            <span>{testing ? 'Testing...' : 'Test API Connection'}</span>
          </Button>
        </div>

        {settings.api_key && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Integration Status</h4>
            <div className="text-sm text-green-700">
              <p>✅ API Key configured</p>
              <p>✅ Base URL: {settings.base_url}</p>
              <p>✅ Ready to send WhatsApp messages</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InteraktSettings;