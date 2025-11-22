
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

interface PrintPackingSlipA5Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const PrintPackingSlipA5: React.FC<PrintPackingSlipA5Props> = ({ 
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

  const getVariationDisplay = (item: any) => {
    const variations = [];
    if (item.size) variations.push(`Size: ${item.size}`);
    if (item.color) variations.push(`Color: ${item.color}`);
    if (item.weight) variations.push(`Weight: ${item.weight}kg`);
    
    // Check meta_data for additional variations, but exclude internal/system fields
    if (item.meta_data && Array.isArray(item.meta_data)) {
      item.meta_data.forEach((meta: any) => {
        if (meta.display_key && meta.display_value) {
          // Filter out internal fields that start with underscore
          const key = meta.display_key.trim();
          if (!key.startsWith('_') && key.toLowerCase() !== 'measurements') {
            // Remove "Measurements:" prefix if it exists in display_value
            let value = meta.display_value.toString().trim();
            value = value.replace(/^Measurements:\s*/i, '');
            variations.push(`${key}: ${value}`);
          }
        }
      });
    }
    
    // Also check if item.variation exists and doesn't already have "Measurements:" prefix
    if (item.variation) {
      let variation = item.variation.toString().trim();
      variation = variation.replace(/^Measurements:\s*/i, '');
      if (variation && !variations.some(v => v.includes(variation))) {
        variations.push(variation);
      }
    }
    
    return variations.length > 0 ? variations.join(', ') : 'XL - 42';
  };

  return (
    <div style={{
      width: '5.83in',
      height: '8.27in',
      margin: '0',
      padding: '16px',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.3',
      color: '#000',
      boxSizing: 'border-box',
      overflow: 'hidden',
      pageBreakInside: 'avoid',
      pageBreakAfter: 'avoid'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        {/* Left: Logo, Title, and Order Information */}
        <div style={{ flex: '1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '2px solid #ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              flexShrink: 0
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: '#ec4899',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  lineHeight: '1.1'
                }}>Perfect</div>
                <div style={{
                  color: '#ec4899',
                  fontSize: '10px'
                }}>Collections</div>
              </div>
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0'
            }}>Packing slip</h1>
          </div>
          {/* Order Information - Left Side */}
          <div style={{ fontSize: '13px', marginLeft: '60px' }}>
            <div style={{ marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order No.: </span>
              <span style={{ color: '#374151' }}>{order.order_number || order.id || 'N/A'}</span>
            </div>
            <div style={{ marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Date: </span>
              <span style={{ color: '#374151' }}>{formatDate(order.order_date)}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Method: </span>
              <span style={{ color: '#374151' }}>{order.shipping_method || 'Standard Shipping'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Address Section - Three Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        marginBottom: '12px',
        fontSize: '12px'
      }}>
        {/* From Address */}
        <div>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
            fontSize: '16px',
            margin: '0 0 8px 0'
          }}>From</h3>
          <div>
            <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>
              {companySettings.company_name || 'Perfect Collections'}
            </div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {companySettings.phone && (
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: '1px' }}>
                +91 {companySettings.phone}
              </div>
            )}
          </div>
        </div>

        {/* Bill To Address */}
        <div>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
            fontSize: '18px',
            margin: '0 0 8px 0'
          }}>Bill to</h3>
          <div>
            <div style={{ fontWeight: '500', fontSize: '16px', marginBottom: '2px' }}>
              {order.customer_name}
            </div>
            {formatBillingAddress(
              order.billing_address || order.shipping_address,
              order.billing_postcode || order.shipping_postcode,
              order.billing_city || order.shipping_city,
              order.billing_state || order.shipping_state
            ).map((line, index) => (
              <div key={index} style={{ fontSize: '16px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {order.customer_email && (
              <div style={{ fontSize: '16px', color: '#374151', marginBottom: '1px' }}>
                Email: {order.customer_email}
              </div>
            )}
            {order.customer_phone && (
              <div style={{ fontSize: '16px', color: '#2563eb', marginBottom: '1px', fontWeight: '600' }}>
                Phone: {order.customer_phone}
              </div>
            )}
          </div>
        </div>

        {/* Ship To Address */}
        <div>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
            fontSize: '18px',
            margin: '0 0 8px 0'
          }}>Ship to</h3>
          <div>
            <div style={{ fontWeight: '500', fontSize: '16px', marginBottom: '2px' }}>
              {order.customer_name}
            </div>
            {formatShippingAddress(
              order.shipping_address,
              order.shipping_postcode,
              order.shipping_city,
              order.shipping_state
            ).map((line, index) => (
              <div key={index} style={{ fontSize: '16px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div style={{ marginBottom: '12px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: '0',
          fontSize: '14px',
          pageBreakInside: 'avoid'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #d1d5db' }}>
              <th style={{
                textAlign: 'left',
                padding: '4px 2px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '32px'
              }}>S.No</th>
              <th style={{
                textAlign: 'left',
                padding: '4px 2px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '48px'
              }}>Image</th>
              <th style={{
                textAlign: 'left',
                padding: '4px 2px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>Product</th>
              <th style={{
                textAlign: 'center',
                padding: '4px 2px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '64px'
              }}>Quantity</th>
              <th style={{
                textAlign: 'right',
                padding: '4px 2px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '80px'
              }}>Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.slice(0, 6).map((item: any, index: number) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 2px', color: '#374151' }}>{index + 1}</td>
                  <td style={{ padding: '4px 2px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '4px 2px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '11px', lineHeight: '1.2', marginBottom: '1px' }}>
                      ₹{(item.total || item.price || 0).toFixed(2)}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px', lineHeight: '1.2', marginBottom: '1px' }}>
                      {item.name || '4434 - Anarkali Kurtis - XL - 42'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: '1.2' }}>
                      Measurements: {getVariationDisplay(item)}
                    </div>
                  </td>
                  <td style={{ padding: '4px 2px', textAlign: 'center', color: '#374151' }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ padding: '4px 2px', textAlign: 'right', color: '#374151' }}>
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '4px 2px', color: '#374151' }}>1</td>
                <td style={{ padding: '4px 2px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#d1d5db',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '4px 2px' }}>
                  <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px', lineHeight: '1.2', marginBottom: '1px' }}>
                    4434 - Anarkali Kurtis - XL - 42
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: '1.2' }}>
                    Measurements: XL - 42
                  </div>
                </td>
                <td style={{ padding: '4px 2px', textAlign: 'center', color: '#374151' }}>1</td>
                <td style={{ padding: '4px 2px', textAlign: 'right', color: '#374151' }}>0.5 kg</td>
              </tr>
            )}
            {order.line_items && order.line_items.length > 6 && (
              <tr>
                <td colSpan={5} style={{ fontSize: '12px', color: '#6b7280', padding: '8px', textAlign: 'center' }}>
                  ... and {order.line_items.length - 6} more items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Barcode Section */}
      {barcodeDataUrl && (
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          pageBreakInside: 'avoid'
        }}>
          <img 
            src={barcodeDataUrl} 
            alt={`Barcode for ${order.order_number || order.id || ''}`} 
            style={{ 
              maxWidth: '250px',
              height: 'auto',
              display: 'block',
              margin: '0 auto'
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default PrintPackingSlipA5;
