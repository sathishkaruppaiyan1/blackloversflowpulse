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

interface DisplayPackingSlip4x6Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const DisplayPackingSlip4x6: React.FC<DisplayPackingSlip4x6Props> = ({
  order,
  companySettings,
  barcodeDataUrl
}) => {
  const formatShippingAddress = (address?: string, postcode?: string, city?: string, state?: string) => {
    if (!address) return ['No shipping address provided'];
    const addressLines = address.split(',').map(line => line.trim()).filter(Boolean);
    const hasPostcode = addressLines.some(line => /\d{6}/.test(line));
    if (postcode && !hasPostcode) {
      if (city && state) {
        const locationLine = `${city}, ${state} ${postcode}`;
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

  const getTotalWeight = () => {
    if (!order.line_items || order.line_items.length === 0) return '500g';
    let totalGrams = 0;
    order.line_items.forEach((item: any) => {
      const weightKg = parseFloat(item.weight || '0.5');
      totalGrams += weightKg * 1000 * (item.quantity || 1);
    });
    return `${Math.round(totalGrams)}g`;
  };

  return (
    <div className="mx-auto bg-white border-2 border-gray-800 shadow-sm" style={{ width: '4in', minHeight: '6in' }}>
      {/* Barcode Section */}
      <div className="text-center p-3 border-b-2 border-gray-800">
        {barcodeDataUrl && (
          <div className="mb-1">
            <img
              src={barcodeDataUrl}
              alt={`Barcode for ${order.order_number}`}
              className="mx-auto max-w-[85%]"
            />
          </div>
        )}
        <div className="text-base font-bold mt-1">{order.order_number}</div>
      </div>

      {/* TO Section */}
      <div className="p-3 border-b-2 border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="font-bold text-xs">TO:</span>
        </div>
        <div>
          <div className="font-bold text-xs mb-0.5">{order.customer_name}</div>
          {formatShippingAddress(
            order.shipping_address,
            order.shipping_postcode,
            order.shipping_city,
            order.shipping_state
          ).map((line, i) => (
            <div key={i} className="text-[11px] leading-snug">{line}</div>
          ))}
          {order.customer_phone && (
            <div className="text-[11px] mt-0.5">Ph: {order.customer_phone}</div>
          )}
        </div>
      </div>

      {/* FROM + COURIER DETAILS - Side by side */}
      <div className="flex border-b-2 border-gray-800">
        {/* FROM */}
        <div className="flex-1 p-3 border-r-2 border-gray-800">
          <div className="font-bold text-[11px] mb-1">FROM:</div>
          <div className="text-[11px]">
            <div className="font-bold">{companySettings.company_name || 'Company'}</div>
            {companySettings.phone && (
              <div>WhatsApp: {companySettings.phone}</div>
            )}
          </div>
        </div>

        {/* COURIER DETAILS */}
        <div className="flex-1 p-3">
          <div className="font-bold text-[11px] mb-1">COURIER DETAILS:</div>
          <div className="text-[11px]">
            <div>Order: <strong>{order.order_number}</strong></div>
            <div>Weight: {getTotalWeight()}</div>
            <div>Items: {order.items}</div>
            <div>Total: &#8377;{order.total.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* PRODUCTS Section */}
      <div className="p-3 border-b-2 border-gray-800">
        <div className="font-bold text-[11px] mb-1.5">PRODUCTS:</div>
        <div className="text-[11px]">
          {order.line_items && order.line_items.length > 0 ? (
            order.line_items.map((item: any, index: number) => {
              const variations: string[] = [];
              if (item.color) variations.push(item.color);
              if (item.size) variations.push(item.size);
              if (item.meta_data && Array.isArray(item.meta_data)) {
                item.meta_data.forEach((meta: any) => {
                  if (meta.display_key && meta.display_value && !meta.display_key.startsWith('_')) {
                    const val = meta.display_value.toString().trim();
                    if (val && !variations.includes(val)) {
                      variations.push(val);
                    }
                  }
                });
              }
              const variationStr = variations.length > 0 ? ` - ${variations.join(' / ')}` : '';
              return (
                <div key={index} className="mb-0.5">
                  - {item.name}{variationStr} (Qty: {item.quantity || 1})
                </div>
              );
            })
          ) : (
            <div>- Product (Qty: 1)</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 text-center font-bold text-[11px] text-red-600">
        PARCEL OPENING VIDEO is MUST For raising complaints
      </div>
    </div>
  );
};

export default DisplayPackingSlip4x6;
