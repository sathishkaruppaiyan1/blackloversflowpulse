
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Courier {
  id: string;
  name: string;
  tracking_url: string;
  example_number: string;
  pattern_prefix?: string;
  pattern_length?: number;
  api_key?: string;
  is_active: boolean;
}

const CourierSettings = () => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tracking_url: '',
    example_number: '',
    pattern_prefix: '',
    pattern_length: '',
    api_key: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCouriers();
    }
  }, [user]);

  const fetchCouriers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setCouriers(data || []);
    } catch (error: any) {
      console.error('Error fetching couriers:', error);
      toast.error('Failed to load couriers');
    } finally {
      setLoading(false);
    }
  };

  const saveCourier = async () => {
    if (!user || !formData.name.trim()) {
      toast.error('Courier name is required');
      return;
    }

    try {
      if (editingCourier) {
        const { error } = await supabase
          .from('couriers')
          .update({
            name: formData.name.trim(),
            tracking_url: formData.tracking_url.trim(),
            example_number: formData.example_number.trim(),
            pattern_prefix: formData.pattern_prefix.trim(),
            pattern_length: formData.pattern_length ? parseInt(formData.pattern_length) : null,
            api_key: formData.api_key.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCourier.id);

        if (error) throw error;
        toast.success('Courier updated successfully!');
      } else {
        const { error } = await supabase
          .from('couriers')
          .insert({
            user_id: user.id,
            name: formData.name.trim(),
            tracking_url: formData.tracking_url.trim(),
            example_number: formData.example_number.trim(),
            pattern_prefix: formData.pattern_prefix.trim(),
            pattern_length: formData.pattern_length ? parseInt(formData.pattern_length) : null,
            api_key: formData.api_key.trim()
          });

        if (error) throw error;
        toast.success('Courier added successfully!');
      }

      resetForm();
      fetchCouriers();
    } catch (error: any) {
      console.error('Error saving courier:', error);
      toast.error('Failed to save courier');
    }
  };

  const deleteCourier = async (courierId: string) => {
    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courierId);

      if (error) throw error;
      toast.success('Courier deleted successfully!');
      fetchCouriers();
    } catch (error: any) {
      console.error('Error deleting courier:', error);
      toast.error('Failed to delete courier');
    }
  };

  const toggleCourierStatus = async (courierId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) throw error;
      toast.success(`Courier ${isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchCouriers();
    } catch (error: any) {
      console.error('Error updating courier status:', error);
      toast.error('Failed to update courier status');
    }
  };

  const openAddDialog = () => {
    setEditingCourier(null);
    setFormData({ name: '', tracking_url: '', example_number: '', pattern_prefix: '', pattern_length: '', api_key: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      tracking_url: courier.tracking_url || '',
      example_number: courier.example_number || '',
      pattern_prefix: courier.pattern_prefix || '',
      pattern_length: courier.pattern_length ? courier.pattern_length.toString() : '',
      api_key: courier.api_key || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', tracking_url: '', example_number: '', pattern_prefix: '', pattern_length: '', api_key: '' });
    setEditingCourier(null);
    setDialogOpen(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading couriers...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Courier Management</CardTitle>
              <CardDescription>
                Manage your shipping couriers and their tracking information
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Courier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCourier ? 'Edit Courier' : 'Add New Courier'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure courier details for tracking and shipping
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="courier_name">Courier Name *</Label>
                    <Input
                      id="courier_name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., DHL Express"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking_url">Tracking URL</Label>
                    <Input
                      id="tracking_url"
                      value={formData.tracking_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, tracking_url: e.target.value }))}
                      placeholder="https://example.com/track/{tracking_number}"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use {'{tracking_number}'} as placeholder for the actual tracking number
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="example_number">Example Tracking Number</Label>
                    <Input
                      id="example_number"
                      value={formData.example_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, example_number: e.target.value }))}
                      placeholder="e.g., DH123456789"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pattern_prefix">Pattern Prefix</Label>
                      <Input
                        id="pattern_prefix"
                        value={formData.pattern_prefix}
                        onChange={(e) => setFormData(prev => ({ ...prev, pattern_prefix: e.target.value }))}
                        placeholder="e.g., 4, DH, 2158"
                      />
                      <p className="text-sm text-muted-foreground">
                        Starting digits/characters for auto-detection
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pattern_length">Expected Length</Label>
                      <Input
                        id="pattern_length"
                        type="number"
                        value={formData.pattern_length}
                        onChange={(e) => setFormData(prev => ({ ...prev, pattern_length: e.target.value }))}
                        placeholder="e.g., 15"
                      />
                      <p className="text-sm text-muted-foreground">
                        Total tracking number length
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key (Optional)</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="API key for tracking details"
                    />
                    <p className="text-sm text-muted-foreground">
                      For automatic tracking detail fetching
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={saveCourier}>
                    {editingCourier ? 'Update' : 'Add'} Courier
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {couriers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No couriers configured. Add your first courier to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {couriers.map((courier) => (
                <div key={courier.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{courier.name}</h3>
                      <Badge variant={courier.is_active ? 'default' : 'secondary'}>
                        {courier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {courier.tracking_url && (
                      <p className="text-sm text-muted-foreground mb-1">
                        Tracking URL: {courier.tracking_url}
                      </p>
                    )}
                    {courier.example_number && (
                      <p className="text-sm text-muted-foreground">
                        Example: {courier.example_number}
                      </p>
                    )}
                    {courier.pattern_prefix && (
                      <p className="text-sm text-muted-foreground">
                        Pattern: Starts with "{courier.pattern_prefix}"
                        {courier.pattern_length && ` (${courier.pattern_length} chars)`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={courier.is_active}
                      onCheckedChange={(checked) => toggleCourierStatus(courier.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(courier)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCourier(courier.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourierSettings;
