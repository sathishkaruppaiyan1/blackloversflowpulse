import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PackingSlipTemplate from '../PackingSlipTemplate';

const GeneralSettings = () => {
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [defaultLabelFormat, setDefaultLabelFormat] = useState<'A4' | 'A5' | 'thermal'>('A4');
  const [bypassPackingStage, setBypassPackingStage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        .from('company_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyName(data.company_name || '');
        setAddressLine1(data.address_line1 || '');
        setAddressLine2(data.address_line2 || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostalCode(data.postal_code || '');
        setCountry(data.country || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setDefaultLabelFormat(
          data.default_label_format === 'A5' ? 'A5' :
          data.default_label_format === 'thermal' ? 'thermal' : 'A4'
        );
        setBypassPackingStage(data.bypass_packing_stage ?? false);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          user_id: user?.id,
          company_name: companyName,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city: city,
          state: state,
          postal_code: postalCode,
          country: country,
          phone: phone,
          email: email,
          default_label_format: defaultLabelFormat,
          bypass_packing_stage: bypassPackingStage,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Label Format Section */}
      <Card>
        <CardHeader>
          <CardTitle>Label Format Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultLabelFormat">Default Label Format</Label>
            <Select value={defaultLabelFormat} onValueChange={(value: 'A4' | 'A5' | 'thermal') => setDefaultLabelFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 (8.27" × 11.69")</SelectItem>
                <SelectItem value="A5">A5 (5.83" × 8.27")</SelectItem>
                <SelectItem value="thermal">4×6 Thermal (4" × 6")</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the default format for packing slips. This will be used for all new orders.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Workflow Section */}
      <Card>
        <CardHeader>
          <CardTitle>Order Workflow Settings</CardTitle>
          <CardDescription>Configure how orders move through the fulfillment stages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bypassPacking">Bypass Packing Stage</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, orders will automatically move to tracking stage after printing, skipping the packing stage. The packing page will be hidden from navigation.
              </p>
            </div>
            <Switch
              id="bypassPacking"
              checked={bypassPackingStage}
              onCheckedChange={setBypassPackingStage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Packing Slip Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <PackingSlipTemplate showPrintButton={false} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
