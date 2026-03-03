import React from 'react';

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
          <div className="text-xl font-bold text-gray-800">{companySettings.company_name || 'Company'}</div>
          <span className="text-gray-300">|</span>
          <h1 className="text-4xl font-bold text-gray-800">Packing slip</h1>
        </div>

        {/* Right: Order Information */}
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
          <h3 className="font-bold text-gray-800 mb-3 text-lg">From</h3>
          <div className="space-y-1 text-gray-700">
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
              <div className="text-sm text-blue-600 font-semibold">Phone: {order.customer_phone}</div>
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

      {/* Product Table */}
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
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || 'Product'}
                        className="w-12 h-12 rounded border object-cover"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-gray-200 rounded border flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
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
              <tr className="border-b border-gray-200">
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

export default DisplayPackingSlipA4;