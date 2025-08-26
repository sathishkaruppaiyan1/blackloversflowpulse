import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import JsBarcode from 'jsbarcode';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  billing_address?: string;
  total: number;
  items: number;
  line_items?: any[];
  order_date?: string;
  shipping_method?: string;
  shipping_cost?: number;
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

interface PackingSlipA5Props {
  order: Order;
}

const PackingSlipA5: React.FC<PackingSlipA5Props> = ({ order }) => {
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
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchCompanySettings();
    }
  }, [user]);

  useEffect(() => {
    generateBarcode();
  }, [order.order_number]);

  const generateBarcode = () => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, order.order_number, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 5,
        background: "#ffffff",
        lineColor: "#000000"
      });
      setBarcodeDataUrl(canvas.toDataURL());
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  };

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
      `${settings.city}, ${settings.postal_code}`,
      settings.state
    ].filter(Boolean);
    
    return parts;
  };

  const formatShippingAddress = (address?: string) => {
    if (!address) return ['No shipping address provided'];
    return address.split(',').map(line => line.trim());
  };

  const formatBillingAddress = (address?: string) => {
    if (!address) return ['No billing address provided'];
    return address.split(',').map(line => line.trim());
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    return new Date(dateString).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const calculateTotalWeight = () => {
    return order.line_items?.reduce((total, item) => {
      return total + (parseFloat(item.weight || '0.5') * (item.quantity || 1));
    }, 0).toFixed(1) || '0.5';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white" style={{ width: '5.83in', minHeight: '8.27in' }}>
      {/* Header Section - Compact */}
      <div className="flex justify-between items-start mb-4">
        {/* Left: Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-bg">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-pink-500 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-navy-800" style={{ color: '#1e3a8a' }}>
            Packing slip
          </h1>
        </div>

        {/* Right: Order info - Compact */}
        <div className="text-right text-sm">
          <div className="mb-1">
            <span className="font-medium text-gray-600">Order No.: </span>
            <span className="text-gray-900">{order.order_number}</span>
          </div>
          <div className="mb-1">
            <span className="font-medium text-gray-600">Date: </span>
            <span className="text-gray-900">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Method: </span>
            <span className="text-gray-900 text-xs">{order.shipping_method || 'Standard'}</span>
          </div>
        </div>
      </div>

      {/* Barcode Section - Smaller */}
      {barcodeDataUrl && (
        <div className="flex justify-center my-4">
          <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="max-w-full" />
        </div>
      )}

      {/* Address Section - Three Columns but Compact */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
        {/* From Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">From</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-medium text-xs">{companySettings.company_name || 'Perfect Collections'}</div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
            {companySettings.phone && (
              <div className="text-xs">{companySettings.phone}</div>
            )}
          </div>
        </div>

        {/* Bill To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Bill to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-medium text-xs">{order.customer_name}</div>
            {formatBillingAddress(order.billing_address || order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
            {order.customer_phone && (
              <div className="text-xs">{order.customer_phone}</div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Ship to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-medium text-xs">{order.customer_name}</div>
            {formatShippingAddress(order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table - Compact */}
      <div className="mb-6">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-1 font-semibold text-gray-800 w-8">S.No</th>
              <th className="text-left py-2 px-1 font-semibold text-gray-800 w-12">Image</th>
              <th className="text-left py-2 px-1 font-semibold text-gray-800">Product</th>
              <th className="text-center py-2 px-1 font-semibold text-gray-800 w-16">Quantity</th>
              <th className="text-right py-2 px-1 font-semibold text-gray-800 w-20">Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.slice(0, 6).map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-1 text-gray-700">{index + 1}</td>
                  <td className="py-2 px-1">
                    <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center">
                      <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <div className="font-medium text-gray-800 text-xs leading-tight">{item.name || 'Product Name'}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-tight">
                      {item.variation && (
                        <span>{item.variation}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center text-gray-700">{item.quantity || 1}</td>
                  <td className="py-2 px-1 text-right text-gray-700">
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-600">
                  <div className="font-medium text-xs">Sample - Anarkali Kurtis</div>
                  <div className="text-xs mt-1">XL - 42</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {order.line_items && order.line_items.length > 6 && (
          <div className="text-xs text-gray-600 mt-2 text-center">
            ... and {order.line_items.length - 6} more items
          </div>
        )}
      </div>

      {/* Footer - Compact */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-3 border-t border-gray-200">
        Professional packing slip - Handle with care
      </div>
    </div>
  );
};

export default PackingSlipA5;