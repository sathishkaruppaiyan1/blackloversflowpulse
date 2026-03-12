import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, User } from 'lucide-react';
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
  total: number;
  items: number;
  line_items?: any[];
  tracking_number?: string;
  carrier?: string;
  status: string;
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
  default_label_format: 'A4' | 'A5' | 'thermal';
}

interface ShippingLabelPreviewProps {
  order: Order;
  format?: 'A4' | 'A5' | 'thermal';
}

const ShippingLabelPreview: React.FC<ShippingLabelPreviewProps> = ({ order, format: propFormat }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    default_label_format: 'A4'
  });
  const { user } = useAuth();
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  const labelFormat = propFormat || companySettings.default_label_format;

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
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 5
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
          email: data.email || '',
          default_label_format: (data.default_label_format as 'A4' | 'A5' | 'thermal') || 'A4'
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

  // Thermal printer label (4x6 inch)
  if (labelFormat === 'thermal') {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-white border border-black print:border-none" style={{ width: '4in', minHeight: '6in' }}>
        {/* Header with Barcode */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold mb-2">SHIPPING LABEL</h1>
          {barcodeDataUrl && (
            <div className="flex justify-center mb-2">
              <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="max-w-full" />
            </div>
          )}
          <p className="text-xs">Order #{order.order_number}</p>
        </div>

        {/* FROM Address - Compact */}
        <div className="mb-3">
          <div className="text-sm font-semibold mb-1">FROM:</div>
          <div className="text-xs">
            <div className="font-medium">{companySettings.company_name || 'Your Company'}</div>
            <div>{companySettings.address_line1}</div>
            {companySettings.address_line2 && <div>{companySettings.address_line2}</div>}
            <div>{companySettings.city}, {companySettings.state} {companySettings.postal_code}</div>
            <div>{companySettings.country}</div>
            {companySettings.phone && <div>Ph: {companySettings.phone}</div>}
          </div>
        </div>

        {/* TO Address - Prominent */}
        <div className="mb-3 p-2 border border-black">
          <div className="text-sm font-semibold mb-1">SHIP TO:</div>
          <div className="text-sm">
            <div className="font-semibold">{order.customer_name}</div>
            <div className="whitespace-pre-line">{formatShippingAddress(order.shipping_address)}</div>
            {order.customer_phone && <div>Ph: {order.customer_phone}</div>}
          </div>
        </div>

        {/* Product Summary */}
        <div className="mb-3">
          <div className="text-xs">
            <div className="flex justify-between">
              <span>Items: {order.items}</span>
              <span>Total: ₹{order.total.toFixed(2)}</span>
            </div>
            {order.carrier && (
              <div className="mt-1">
                <span className="font-medium">Carrier:</span> {order.carrier}
              </div>
            )}
            {order.tracking_number && (
              <div>
                <span className="font-medium">Tracking:</span> {order.tracking_number}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-black mt-4">
          Handle with care
        </div>
      </div>
    );
  }

  // A5 Format
  if (labelFormat === 'A5') {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 bg-white border border-black print:border-none" style={{ width: '5.8in', minHeight: '8.3in' }}>
        {/* Header */}
        <div className="text-center mb-4 pb-3 border-b border-black">
          <h1 className="text-xl font-bold">SHIPPING LABEL</h1>
          {barcodeDataUrl && (
            <div className="flex justify-center my-3">
              <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="max-w-full" />
            </div>
          )}
          <p className="text-sm">Order #{order.order_number}</p>
        </div>

        {/* From and To Addresses */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          {/* FROM Address */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <h2 className="font-semibold">FROM</h2>
            </div>
            <div className="bg-white p-3 rounded border border-black text-sm">
              <div className="font-semibold mb-1">{companySettings.company_name || 'Your Company'}</div>
              <div className="whitespace-pre-line text-xs">{formatAddress(companySettings) || 'Please configure company address in settings'}</div>
              {companySettings.phone && <div className="text-xs mt-1">Phone: {companySettings.phone}</div>}
            </div>
          </div>

          {/* TO Address */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <h2 className="font-semibold">TO</h2>
            </div>
            <div className="bg-white p-3 rounded border border-black">
              <div className="font-semibold mb-1">{order.customer_name}</div>
              <div className="text-sm whitespace-pre-line mb-1">{formatShippingAddress(order.shipping_address)}</div>
              {order.customer_phone && <div className="text-xs">Phone: {order.customer_phone}</div>}
            </div>
          </div>
        </div>

        {/* Product Details - Compact */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" />
            PRODUCTS
          </h3>
          <div className="bg-white p-3 rounded border border-black">
            <div className="text-sm">
              <div className="flex justify-between font-medium">
                <span>Items: {order.items}</span>
                <span>Total: ₹{order.total.toFixed(2)}</span>
              </div>
              {order.line_items && order.line_items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {order.line_items.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="text-xs flex justify-between">
                      <span>{item.name} (Qty: {item.quantity || 1})</span>
                      <span>₹{((item.total || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.line_items.length > 3 && (
                    <div className="text-xs text-black">... and {order.line_items.length - 3} more items</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        {(order.tracking_number || order.carrier) && (
          <div className="mb-4 p-3 bg-white border border-black rounded">
            <h3 className="font-semibold text-black mb-1 text-sm">Tracking</h3>
            <div className="text-xs text-black">
              {order.carrier && <div>Carrier: {order.carrier}</div>}
              {order.tracking_number && <div>Tracking: {order.tracking_number}</div>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-black pt-3 border-t border-black">
          Thank you for your business! Handle with care.
        </div>
      </div>
    );
  }

  // A4 Format (Default/Original)
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white border-2 border-black print:border-none print:shadow-none">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-2xl font-bold text-black">SHIPPING LABEL</h1>
        {barcodeDataUrl && (
          <div className="flex justify-center my-4">
            <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="max-w-full" />
          </div>
        )}
        <p className="text-sm text-black mt-1">Order #{order.order_number}</p>
        <div className="mt-2">
          <Badge className="text-xs px-3 py-1">
            Status: {order.status}
          </Badge>
        </div>
      </div>

      {/* From and To Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        {/* FROM Address */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-black">FROM</h2>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-black">
            <div className="font-semibold text-black mb-2">
              {companySettings.company_name || 'Your Company'}
            </div>
            <div className="text-sm text-black whitespace-pre-line">
              {formatAddress(companySettings) || 'Please configure company address in settings'}
            </div>
            {companySettings.phone && (
              <div className="text-sm text-black mt-2">
                Phone: {companySettings.phone}
              </div>
            )}
            {companySettings.email && (
              <div className="text-sm text-black">
                Email: {companySettings.email}
              </div>
            )}
          </div>
        </div>

        {/* TO Address */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-black">TO</h2>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-black">
            <div className="font-semibold text-black mb-2">
              {order.customer_name}
            </div>
            <div className="text-sm text-black whitespace-pre-line mb-2">
              {formatShippingAddress(order.shipping_address)}
            </div>
            {order.customer_phone && (
              <div className="text-sm text-black">
                <span className="font-medium">Phone:</span> {order.customer_phone}
              </div>
            )}
            {order.customer_email && (
              <div className="text-sm text-black">
                <span className="font-medium">Email:</span> {order.customer_email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-black">PRODUCT DETAILS</h2>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-black overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-black">Product Name</th>
                <th className="text-left py-2 font-medium text-black">SKU</th>
                <th className="text-left py-2 font-medium text-black">Variation</th>
                <th className="text-left py-2 font-medium text-black">Qty</th>
                <th className="text-right py-2 font-medium text-black">Price (₹)</th>
                <th className="text-right py-2 font-medium text-black">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {order.line_items && order.line_items.length > 0 ? (
                order.line_items.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-black">
                    <td className="py-2 text-black">{item.name || 'N/A'}</td>
                    <td className="py-2 text-black">{item.sku || 'N/A'}</td>
                    <td className="py-2 text-black">{item.variation || 'N/A'}</td>
                    <td className="py-2 text-black">{item.quantity || 1}</td>
                    <td className="py-2 text-black text-right">₹{((item.price || 0)).toFixed(2)}</td>
                    <td className="py-2 text-black text-right">₹{((item.total || 0)).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-black">
                    {order.items} item(s) - Total: ₹{order.total.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-semibold">
                <td colSpan={5} className="py-2 text-right text-black">Grand Total:</td>
                <td className="py-2 text-right text-black">₹{order.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tracking Information */}
      {(order.tracking_number || order.carrier) && (
        <div className="mb-6 p-4 bg-white border border-black rounded-lg">
          <h3 className="font-semibold text-black mb-2">Tracking Information</h3>
          <div className="space-y-1 text-sm text-black">
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
      <div className="text-center pt-4 border-t-2 border-black">
        <p className="text-xs text-black">
          Thank you for your business! Handle with care.
        </p>
      </div>
    </div>
  );
};

export default ShippingLabelPreview;
