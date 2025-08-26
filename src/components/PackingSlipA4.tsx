
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

interface PackingSlipA4Props {
  order: Order;
}

const PackingSlipA4: React.FC<PackingSlipA4Props> = ({ order }) => {
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
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
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
    <div className="w-full max-w-4xl mx-auto p-8 bg-white" style={{ width: '8.27in', minHeight: '11.69in' }}>
      {/* Header Section - Logo and Title on left, Order details on right */}
      <div className="flex justify-between items-start mb-8">
        {/* Left: Logo and Packing slip title */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border-4 border-pink-500 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-pink-500 font-bold text-lg leading-tight">Perfect</div>
              <div className="text-pink-500 text-xs">Collections</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800">Packing slip</h1>
        </div>

        {/* Right: Order information */}
        <div className="text-right">
          <div className="mb-2">
            <span className="font-bold text-gray-800">Order No.: </span>
            <span className="text-gray-700">{order.order_number}</span>
          </div>
          <div className="mb-2">
            <span className="font-bold text-gray-800">Order Date: </span>
            <span className="text-gray-700">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-bold text-gray-800">Shipping Method: </span>
            <span className="text-gray-700">{order.shipping_method || 'Shipping Cost'}</span>
          </div>
        </div>
      </div>

      {/* Address Section - Three Columns exactly as in reference */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* From Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 text-lg">From</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold">{companySettings.company_name || 'Perfect Collections'}</div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} className="text-sm">{line}</div>
            ))}
            {companySettings.phone && (
              <div className="text-sm">+91 {companySettings.phone}</div>
            )}
          </div>
        </div>

        {/* Bill To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 text-lg">Bill to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold">{order.customer_name}</div>
            {formatBillingAddress(order.billing_address || order.shipping_address).map((line, index) => (
              <div key={index} className="text-sm">{line}</div>
            ))}
            {order.customer_email && (
              <div className="text-sm">Email: {order.customer_email}</div>
            )}
            {order.customer_phone && (
              <div className="text-sm">Phone: {order.customer_phone}</div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 text-lg">Ship to</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold">{order.customer_name}</div>
            {formatShippingAddress(order.shipping_address).map((line, index) => (
              <div key={index} className="text-sm">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table - Exact columns as in reference */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-2 font-bold text-gray-800 w-16">S.No</th>
              <th className="text-left py-3 px-2 font-bold text-gray-800 w-20">Image</th>
              <th className="text-left py-3 px-2 font-bold text-gray-800">Product</th>
              <th className="text-center py-3 px-2 font-bold text-gray-800 w-20">Quantity</th>
              <th className="text-right py-3 px-2 font-bold text-gray-800 w-32">Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-4 px-2 text-gray-700">{index + 1}</td>
                  <td className="py-4 px-2">
                    <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                      <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="font-medium text-gray-800">{item.name || '4434 - Anarkali Kurtis - XL - 42'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {item.variation ? `Measurements: ${item.variation}` : 'Measurements: XL - 42'}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center text-gray-700">{item.quantity || 1}</td>
                  <td className="py-4 px-2 text-right text-gray-700">
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 px-2 text-gray-700">1</td>
                <td className="py-4 px-2">
                  <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="font-medium text-gray-800">4434 - Anarkali Kurtis - XL - 42</div>
                  <div className="text-sm text-gray-600 mt-1">Measurements: XL - 42</div>
                </td>
                <td className="py-4 px-2 text-center text-gray-700">1</td>
                <td className="py-4 px-2 text-right text-gray-700">0.5 kg</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PackingSlipA4;
