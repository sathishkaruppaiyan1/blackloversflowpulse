import React from 'react';
import { resolveLineItemImage } from '@/utils/printingImageResolver';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  alternate_phone?: string;
  whatsapp_number?: string;
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

interface DisplayPackingSlipA4Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const DisplayPackingSlipA4: React.FC<DisplayPackingSlipA4Props> = ({ 
  order, 
  companySettings, 
  barcodeDataUrl 
}) => {
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

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-black">{companySettings.company_name || 'Company'}</div>
          <span className="text-black">|</span>
          <h1 className="text-4xl font-bold text-black">Packing slip</h1>
        </div>

        {/* Right: Order Information */}
        <div className="text-right">
          <div className="mb-2">
            <span className="font-bold text-gray-800">Order No.: </span>
            <span className="text-black">{order.order_number}</span>
          </div>
          <div className="mb-2">
            <span className="font-bold text-gray-800">Order Date: </span>
            <span className="text-black">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-bold text-gray-800">Shipping Method: </span>
            <span className="text-black">{order.shipping_method || 'Shipping Cost'}</span>
          </div>
        </div>
      </div>

      {/* Barcode Section */}
      {barcodeDataUrl && (
        <div className="text-center mb-8">
          <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="mx-auto" />
        </div>
      )}

      {/* Address Section - Three Columns */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* From Address */}
        <div>
          <h3 className="font-bold text-black mb-3 text-lg">From</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold">{companySettings.company_name || 'Company'}</div>
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
          <h3 className="font-bold text-black mb-3 text-lg">Bill to</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold">{order.customer_name}</div>
            {formatBillingAddress(order.billing_address || order.shipping_address).map((line, index) => (
              <div key={index} className="text-sm">{line}</div>
            ))}
            {order.customer_email && (
              <div className="text-sm">Email: {order.customer_email}</div>
            )}
            {order.customer_phone && (
              <div className="text-sm text-black font-semibold">Phone: {order.customer_phone}</div>
            )}
            {order.alternate_phone && (
              <div className="text-sm text-black">Alt Phone: {order.alternate_phone}</div>
            )}
            {order.whatsapp_number && (
              <div className="text-sm text-black font-semibold">WhatsApp: {order.whatsapp_number}</div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-black mb-3 text-lg">Ship to</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold">{order.customer_name}</div>
            {formatShippingAddress(order.shipping_address).map((line, index) => (
              <div key={index} className="text-sm">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 px-2 font-bold text-black w-16">S.No</th>
              <th className="text-left py-3 px-2 font-bold text-black w-20">Image</th>
              <th className="text-left py-3 px-2 font-bold text-black">Product</th>
              <th className="text-center py-3 px-2 font-bold text-black w-20">Quantity</th>
              <th className="text-right py-3 px-2 font-bold text-black w-32">Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.map((item: any, index: number) => {
                const itemImage = resolveLineItemImage(item);
                return (
                <tr key={index} className="border-b border-black">
                  <td className="py-4 px-2 text-black">{index + 1}</td>
                  <td className="py-4 px-2">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.name || 'Product'}
                        className="w-12 h-12 rounded border-black border object-cover"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-white rounded border border-black flex items-center justify-center ${itemImage ? 'hidden' : ''}`}>
                      <div className="w-8 h-8 bg-black rounded"></div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="font-medium text-black">{item.name || '4434 - Anarkali Kurtis - XL - 42'}</div>
                    <div className="text-sm text-black mt-1">
                      {item.variation ? `Measurements: ${item.variation}` : 'Measurements: XL - 42'}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center text-black">{item.quantity || 1}</td>
                  <td className="py-4 px-2 text-right text-black">
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              )})
            ) : (
              <tr className="border-b border-black">
                <td className="py-4 px-2 text-black">1</td>
                <td className="py-4 px-2">
                  <div className="w-12 h-12 bg-white rounded border border-black flex items-center justify-center">
                    <div className="w-8 h-8 bg-black rounded"></div>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="font-medium text-black">4434 - Anarkali Kurtis - XL - 42</div>
                  <div className="text-sm text-black mt-1">Measurements: XL - 42</div>
                </td>
                <td className="py-4 px-2 text-center text-black">1</td>
                <td className="py-4 px-2 text-right text-black">0.5 kg</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisplayPackingSlipA4;
