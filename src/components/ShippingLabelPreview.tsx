
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  total: number;
  items: number;
  line_items?: any[];
  tracking_number?: string;
  carrier?: string;
}

interface CompanySettings {
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
}

interface ShippingLabelPreviewProps {
  order: Order;
}

const ShippingLabelPreview: React.FC<ShippingLabelPreviewProps> = ({ order }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCompanySettings();
    }
  }, [user]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanySettings({
          company_name: data.company_name || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          phone: data.phone || '',
          email: data.email || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
    }
  };

  const formatAddress = (settings: CompanySettings) => {
    const parts = [
      settings.address_line1,
      settings.address_line2,
      `${settings.city}, ${settings.state} ${settings.postal_code}`,
      settings.country
    ].filter(Boolean);
    
    return parts.join('\n');
  };

  const formatShippingAddress = (address?: string) => {
    if (!address) return 'No shipping address provided';
    return address.replace(/,\s*/g, '\n');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white border-2 border-gray-300 print:border-none print:shadow-none">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">SHIPPING LABEL</h1>
        <p className="text-sm text-gray-600 mt-1">Order #{order.order_number}</p>
      </div>

      {/* From and To Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        {/* FROM Address */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">FROM</h2>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="font-semibold text-gray-800 mb-2">
              {companySettings.company_name || 'Your Company'}
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {formatAddress(companySettings) || 'Please configure company address in settings'}
            </div>
            {companySettings.phone && (
              <div className="text-sm text-gray-600 mt-2">
                Phone: {companySettings.phone}
              </div>
            )}
            {companySettings.email && (
              <div className="text-sm text-gray-600">
                Email: {companySettings.email}
              </div>
            )}
          </div>
        </div>

        {/* TO Address */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">TO</h2>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="font-semibold text-gray-800 mb-2">
              {order.customer_name}
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-line mb-2">
              {formatShippingAddress(order.shipping_address)}
            </div>
            {order.customer_phone && (
              <div className="text-sm text-gray-600">
                Phone: {order.customer_phone}
              </div>
            )}
            {order.customer_email && (
              <div className="text-sm text-gray-600">
                Email: {order.customer_email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">PRODUCTS</h2>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 mb-2 pb-2 border-b border-gray-200">
            <span>Items</span>
            <span>Quantity</span>
            <span>Total</span>
          </div>
          
          {order.line_items && order.line_items.length > 0 ? (
            order.line_items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-3 gap-4 text-sm text-gray-600 py-1">
                <span>{item.name}</span>
                <span>{item.quantity}</span>
                <span>${(item.total || 0).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-600">
              {order.items} item(s) - Total: ${order.total.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Tracking Information */}
      {(order.tracking_number || order.carrier) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Tracking Information</h3>
          <div className="space-y-1 text-sm text-blue-700">
            {order.carrier && (
              <div>
                <span className="font-medium">Carrier:</span> {order.carrier}
              </div>
            )}
            {order.tracking_number && (
              <div>
                <span className="font-medium">Tracking Number:</span> {order.tracking_number}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 border-t-2 border-gray-200">
        <p className="text-xs text-gray-500">
          Thank you for your business! Handle with care.
        </p>
      </div>
    </div>
  );
};

export default ShippingLabelPreview;
