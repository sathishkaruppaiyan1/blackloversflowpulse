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
  billing_postcode?: string;
  shipping_postcode?: string;
  shipping_city?: string;
  shipping_state?: string;
  billing_city?: string;
  billing_state?: string;
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

interface DisplayPackingSlipA5Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const DisplayPackingSlipA5: React.FC<DisplayPackingSlipA5Props> = ({ 
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

  const formatShippingAddress = (address?: string, postcode?: string, city?: string, state?: string) => {
    if (!address) return ['No shipping address provided'];
    const addressLines = address.split(',').map(line => line.trim()).filter(Boolean);
    
    // Ensure postcode is included - check if it's already in the address or add it separately
    const hasPostcode = addressLines.some(line => /\d{6}/.test(line)); // Check if any line has 6-digit pincode
    
    // If postcode is provided separately and not in address, add it
    if (postcode && !hasPostcode) {
      // Try to add postcode to the city/state line or as a separate line
      if (city && state) {
        const locationLine = `${city}, ${state} ${postcode}`;
        // Replace city/state line if exists, otherwise add at end
        const cityStateIndex = addressLines.findIndex(line => 
          line.includes(city) || line.includes(state)
        );
        if (cityStateIndex >= 0) {
          addressLines[cityStateIndex] = locationLine;
        } else {
          addressLines.push(locationLine);
        }
      } else {
        addressLines.push(postcode);
      }
    }
    
    return addressLines;
  };

  const formatBillingAddress = (address?: string, postcode?: string, city?: string, state?: string) => {
    if (!address) return ['No billing address provided'];
    const addressLines = address.split(',').map(line => line.trim()).filter(Boolean);
    
    // Ensure postcode is included - check if it's already in the address or add it separately
    const hasPostcode = addressLines.some(line => /\d{6}/.test(line)); // Check if any line has 6-digit pincode
    
    // If postcode is provided separately and not in address, add it
    if (postcode && !hasPostcode) {
      // Try to add postcode to the city/state line or as a separate line
      if (city && state) {
        const locationLine = `${city}, ${state} ${postcode}`;
        // Replace city/state line if exists, otherwise add at end
        const cityStateIndex = addressLines.findIndex(line => 
          line.includes(city) || line.includes(state)
        );
        if (cityStateIndex >= 0) {
          addressLines[cityStateIndex] = locationLine;
        } else {
          addressLines.push(locationLine);
        }
      } else {
        addressLines.push(postcode);
      }
    }
    
    return addressLines;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    return new Date(dateString).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const cleanVariation = (variation?: string) => {
    if (!variation) return 'XL - 42';
    let cleaned = variation.toString().trim();
    // Remove duplicate "Measurements:" prefix
    cleaned = cleaned.replace(/^Measurements:\s*/i, '');
    // Remove internal fields like "_reduced_stock: 1"
    cleaned = cleaned.split(',').map(part => part.trim())
      .filter(part => !part.startsWith('_') && part.length > 0)
      .join(', ');
    return cleaned || 'XL - 42';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header Section - Compact */}
      <div className="flex justify-between items-start mb-6">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold text-black">{companySettings.company_name || 'Company'}</div>
          <span className="text-black">|</span>
          <h1 className="text-3xl font-bold text-black">Packing slip</h1>
        </div>

        {/* Right: Order Information - Compact */}
        <div className="text-right text-base">
          <div className="mb-1">
            <span className="font-bold text-black">Order No.: </span>
            <span className="text-black">{order.order_number}</span>
          </div>
          <div className="mb-1">
            <span className="font-bold text-black">Date: </span>
            <span className="text-black">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-bold text-black">Method: </span>
            <span className="text-black text-xs">{order.shipping_method || 'Shipping Cost'}</span>
          </div>
        </div>
      </div>

      {/* Barcode Section - Smaller */}
      {barcodeDataUrl && (
        <div className="text-center mb-4">
          <img src={barcodeDataUrl} alt={`Barcode for ${order.order_number}`} className="mx-auto" />
        </div>
      )}

      {/* Address Section - Three Columns Compact */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        {/* From Address */}
        <div>
          <h3 className="font-bold text-black mb-2 text-base">From</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold text-sm">{companySettings.company_name || 'Company'}</div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} className="text-sm leading-tight">{line}</div>
            ))}
            {companySettings.phone && (
              <div className="text-sm">+91 {companySettings.phone}</div>
            )}
          </div>
        </div>

        {/* Bill To Address */}
        <div>
          <h3 className="font-bold text-black mb-2 text-lg">Bill to</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold text-base">{order.customer_name}</div>
            {formatBillingAddress(
              order.billing_address || order.shipping_address,
              order.billing_postcode || order.shipping_postcode,
              order.billing_city || order.shipping_city,
              order.billing_state || order.shipping_state
            ).map((line, index) => (
              <div key={index} className="text-base leading-tight">{line}</div>
            ))}
            {order.customer_email && (
              <div className="text-base">Email: {order.customer_email}</div>
            )}
            {order.customer_phone && (
              <div className="text-base">Phone: {order.customer_phone}</div>
            )}
            {order.alternate_phone && (
              <div className="text-base text-gray-700">Alt Phone: {order.alternate_phone}</div>
            )}
            {order.whatsapp_number && (
              <div className="text-base text-black font-semibold">WhatsApp: {order.whatsapp_number}</div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-black mb-2 text-lg">Ship to</h3>
          <div className="space-y-1 text-black">
            <div className="font-semibold text-base">{order.customer_name}</div>
            {formatShippingAddress(
              order.shipping_address,
              order.shipping_postcode,
              order.shipping_city,
              order.shipping_state
            ).map((line, index) => (
              <div key={index} className="text-base leading-tight">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table - Compact */}
      <div className="mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-1 font-bold text-black w-8">S.No</th>
              <th className="text-left py-2 px-1 font-bold text-black w-10">Image</th>
              <th className="text-left py-2 px-1 font-bold text-black">Product</th>
              <th className="text-center py-2 px-1 font-bold text-black w-16">Quantity</th>
              <th className="text-right py-2 px-1 font-bold text-black w-20">Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.slice(0, 6).map((item: any, index: number) => {
                const itemImage = resolveLineItemImage(item);
                return (
                <tr key={index} className="border-b border-black">
                   <td className="py-2 px-1 text-black">{index + 1}</td>
                  <td className="py-2 px-1">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.name || 'Product'}
                        className="w-8 h-8 rounded object-cover border border-black"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded bg-white border border-black ${itemImage ? 'hidden' : ''}`} />
                  </td>
                  <td className="py-2 px-1">
                    <div className="font-medium text-black text-base leading-tight">{item.name || '4434 - Anarkali Kurtis - XL - 42'}</div>
                  </td>
                  <td className="py-2 px-1 text-center text-black">{item.quantity || 1}</td>
                  <td className="py-2 px-1 text-right text-black">
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              )})
            ) : (
              <tr className="border-b border-black">
                <td className="py-2 px-1 text-black">1</td>
                <td className="py-2 px-1">
                  <div className="w-8 h-8 rounded bg-white border border-black" />
                </td>
                <td className="py-2 px-1">
                  <div className="font-medium text-black text-base leading-tight">4434 - Anarkali Kurtis - XL - 42</div>
                </td>
                <td className="py-2 px-1 text-center text-black">1</td>
                <td className="py-2 px-1 text-right text-black">0.5 kg</td>
              </tr>
            )}
            {order.line_items && order.line_items.length > 6 && (
              <tr>
                <td colSpan={5} className="text-sm text-black py-2 text-center">
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

export default DisplayPackingSlipA5;
