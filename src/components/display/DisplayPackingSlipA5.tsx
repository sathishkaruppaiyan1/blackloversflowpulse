import React from 'react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
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
          <div className="w-16 h-16 rounded-full border-4 border-pink-500 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-pink-500 font-bold text-base leading-tight">Perfect</div>
              <div className="text-pink-500 text-sm">Collections</div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Packing slip</h1>
        </div>

        {/* Right: Order Information - Compact */}
        <div className="text-right text-base">
          <div className="mb-1">
            <span className="font-bold text-gray-800">Order No.: </span>
            <span className="text-gray-700">{order.order_number}</span>
          </div>
          <div className="mb-1">
            <span className="font-bold text-gray-800">Date: </span>
            <span className="text-gray-700">{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span className="font-bold text-gray-800">Method: </span>
            <span className="text-gray-700 text-xs">{order.shipping_method || 'Shipping Cost'}</span>
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
          <h3 className="font-bold text-gray-800 mb-2 text-base">From</h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold text-sm">{companySettings.company_name || 'Perfect Collections'}</div>
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
          <h3 className="font-bold text-gray-800 mb-2 text-lg">Bill to</h3>
          <div className="space-y-1 text-gray-700">
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
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 className="font-bold text-gray-800 mb-2 text-lg">Ship to</h3>
          <div className="space-y-1 text-gray-700">
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
                    <div className="font-medium text-gray-800 text-base leading-tight">{item.name || '4434 - Anarkali Kurtis - XL - 42'}</div>
                  </td>
                  <td className="py-2 px-1 text-center text-gray-700">{item.quantity || 1}</td>
                  <td className="py-2 px-1 text-right text-gray-700">
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-1 text-gray-700">1</td>
                <td className="py-2 px-1">
                  <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center">
                    <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  </div>
                </td>
                <td className="py-2 px-1">
                  <div className="font-medium text-gray-800 text-base leading-tight">4434 - Anarkali Kurtis - XL - 42</div>
                </td>
                <td className="py-2 px-1 text-center text-gray-700">1</td>
                <td className="py-2 px-1 text-right text-gray-700">0.5 kg</td>
              </tr>
            )}
            {order.line_items && order.line_items.length > 6 && (
              <tr>
                <td colSpan={5} className="text-sm text-gray-600 py-2 text-center">
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