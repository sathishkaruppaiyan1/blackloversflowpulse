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

interface PrintPackingSlip4x6Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const PrintPackingSlip4x6: React.FC<PrintPackingSlip4x6Props> = ({
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

  const cell = {
    border: '1.5px solid #1f2937',
    padding: '8px 10px',
  } as React.CSSProperties;

  return (
    <div style={{
      width: '4in',
      minHeight: '6in',
      margin: '0',
      padding: '6px',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      lineHeight: '1.3',
      color: '#000',
      boxSizing: 'border-box',
      pageBreakAfter: 'always'
    }}>
      <div style={{ border: '2px solid #1f2937' }}>
        {/* Barcode Section */}
        <div style={{ ...cell, textAlign: 'center', borderBottom: '1.5px solid #1f2937' }}>
          {barcodeDataUrl && (
            <div style={{ marginBottom: '4px' }}>
              <img
                src={barcodeDataUrl}
                alt={`Barcode for ${order.order_number}`}
                style={{ maxWidth: '85%', height: 'auto', display: 'block', margin: '0 auto' }}
              />
            </div>
          )}
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
            {order.order_number}
          </div>
        </div>

        {/* TO Section */}
        <div style={{ ...cell, borderBottom: '1.5px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              flexShrink: 0
            }} />
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>TO:</span>
          </div>
          <div style={{ paddingLeft: '0' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '2px' }}>
              {order.customer_name}
            </div>
            {formatShippingAddress(
              order.shipping_address,
              order.shipping_postcode,
              order.shipping_city,
              order.shipping_state
            ).map((line, i) => (
              <div key={i} style={{ fontSize: '11px', lineHeight: '1.4' }}>{line}</div>
            ))}
            {order.customer_phone && (
              <div style={{ fontSize: '11px', marginTop: '2px' }}>Ph: {order.customer_phone}</div>
            )}
          </div>
        </div>

        {/* FROM + COURIER DETAILS - Side by side */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #1f2937' }}>
          {/* FROM */}
          <div style={{ ...cell, flex: 1, borderRight: '1.5px solid #1f2937' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>FROM:</div>
            <div style={{ fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold' }}>{companySettings.company_name || 'Company'}</div>
              {companySettings.phone && (
                <div>WhatsApp: {companySettings.phone}</div>
              )}
            </div>
          </div>

          {/* COURIER DETAILS */}
          <div style={{ ...cell, flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>COURIER DETAILS:</div>
            <div style={{ fontSize: '11px' }}>
              <div>Order: <strong>{order.order_number}</strong></div>
              <div>Weight: {getTotalWeight()}</div>
              <div>Items: {order.items}</div>
              <div>Total: &#8377;{order.total.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* PRODUCTS Section */}
        <div style={{ ...cell, borderBottom: '1.5px solid #1f2937' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>PRODUCTS:</div>
          <div style={{ fontSize: '11px' }}>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.map((item: any, index: number) => {
                const variations = [];
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
                  <div key={index} style={{ marginBottom: '3px', display: 'inline-flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || 'Product'}
                        style={{
                          width: '24px',
                          height: '24px',
                          objectFit: 'cover',
                          borderRadius: '2px',
                          border: '1px solid #e5e7eb',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '2px',
                        flexShrink: 0
                      }} />
                    )}
                    <span>{item.name}{variationStr} (Qty: {item.quantity || 1})</span>
                  </div>
                );
              })
            ) : (
              <div>- Product (Qty: 1)</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          ...cell,
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '11px',
          color: '#dc2626'
        }}>
          PARCEL OPENING VIDEO is MUST For raising complaints
        </div>
      </div>
    </div>
  );
};

export default PrintPackingSlip4x6;
