
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
      `${settings.city} ${settings.postal_code}`,
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
      {/* Header Section - Logo and Title on left, Order details on right */}
      <div className="flex justify-between items-start mb-6">
        {/* Left: Logo and Packing slip title */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full border-3 border-pink-500 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-pink-500 font-bold text-sm leading-tight">Perfect</div>
              <div className="text-pink-500 text-xs">Collections</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Packing slip</h1>
        </div>

        {/* Right: Order info */}
        <div className="text-right text-sm">
          <div className="mb-1">
            <span className="font-bold text-gray-800">Order No.: </span>
            <span className="text-gray-700">{order.order_number}</span>
          </div>
          <div className="mb-1">
            <span className="font-bold text-gray-800">Order Date: </span>
            <span className="text-gray-700">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-bold text-gray-800">Shipping Method: </span>
            <span className="text-gray-700">{order.shipping_method || 'Shipping Cost'}</span>
          </div>
        </div>
      </div>

      {/* Address Section - Three Columns */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
        {/* From Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">From</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold text-xs">{companySettings.company_name || 'Perfect Collections'}</div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
            {companySettings.phone && (
              <div className="text-xs">+91 {companySettings.phone}</div>
            )}
          </div>
        </div>

        {/* Bill To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Bill to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold text-xs">{order.customer_name}</div>
            {formatBillingAddress(order.billing_address || order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
            {order.customer_email && (
              <div className="text-xs">Email: {order.customer_email}</div>
            )}
            {order.customer_phone && (
              <div className="text-xs">Phone: {order.customer_phone}</div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Ship to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold text-xs">{order.customer_name}</div>
            {formatShippingAddress(order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} className="text-xs leading-tight">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="mb-6">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-1 font-bold text-gray-800 w-8">S.No</th>
              <th className="text-left py-2 px-1 font-bold text-gray-800 w-12">Image</th>
              <th className="text-left py-2 px-1 font-bold text-gray-800">Product</th>
              <th className="text-center py-2 px-1 font-bold text-gray-800 w-16">Quantity</th>
              <th className="text-right py-2 px-1 font-bold text-gray-800 w-20">Total weight</th>
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
                    <div className="font-medium text-gray-800 text-xs leading-tight">{item.name || '4434 - Anarkali Kurtis - XL - 42'}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-tight">
                      {item.variation ? `Measurements: ${item.variation}` : 'Measurements: XL - 42'}
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
                <td className="py-2 px-1 text-gray-700">1</td>
                <td className="py-2 px-1">
                  <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center">
                    <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  </div>
                </td>
                <td className="py-2 px-1">
                  <div className="font-medium text-gray-800 text-xs leading-tight">4434 - Anarkali Kurtis - XL - 42</div>
                  <div className="text-xs text-gray-600 mt-0.5 leading-tight">Measurements: XL - 42</div>
                </td>
                <td className="py-2 px-1 text-center text-gray-700">1</td>
                <td className="py-2 px-1 text-right text-gray-700">0.5 kg</td>
              </tr>
            )}
            {order.line_items && order.line_items.length > 6 && (
              <tr>
                <td colSpan={5} className="text-xs text-gray-600 py-2 text-center">
                  ... and {order.line_items.length - 6} more items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PackingSlipA5;
