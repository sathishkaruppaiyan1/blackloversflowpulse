
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

  const getVariationDisplay = (item: any) => {
    const variations = [];
    if (item.size) variations.push(`Size: ${item.size}`);
    if (item.color) variations.push(`Color: ${item.color}`);
    if (item.weight) variations.push(`Weight: ${item.weight}kg`);
    
    // Check meta_data for additional variations
    if (item.meta_data && Array.isArray(item.meta_data)) {
      item.meta_data.forEach((meta: any) => {
        if (meta.display_key && meta.display_value) {
          variations.push(`${meta.display_key}: ${meta.display_value}`);
        }
      });
    }
    
    return variations.length > 0 ? variations.join(', ') : 'XL - 42';
  };

  return (
    <div style={{
      width: '5.83in',
      minHeight: '8.27in',
      margin: '0',
      padding: '24px',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4',
      color: '#000',
      boxSizing: 'border-box'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        {/* Left: Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '3px solid #ec4899',
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
                fontSize: '16px',
                lineHeight: '1.2'
              }}>Perfect</div>
              <div style={{
                color: '#ec4899',
                fontSize: '12px'
              }}>Collections</div>
            </div>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0'
          }}>Packing slip</h1>
        </div>

        {/* Right: Order Information */}
        <div style={{ textAlign: 'right', fontSize: '14px' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order No.: </span>
            <span style={{ color: '#374151' }}>{order.order_number}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order Date: </span>
            <span style={{ color: '#374151' }}>{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Shipping Method: </span>
            <span style={{ color: '#374151' }}>{order.shipping_method || 'Standard Shipping'}</span>
          </div>
        </div>
      </div>

      {/* Address Section - Three Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
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
            <div style={{ fontWeight: '500', fontSize: '12px', marginBottom: '2px' }}>
              {companySettings.company_name || 'Perfect Collections'}
            </div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} style={{ fontSize: '12px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {companySettings.phone && (
              <div style={{ fontSize: '12px', color: '#374151', marginBottom: '1px' }}>
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
            fontSize: '16px',
            margin: '0 0 8px 0'
          }}>Bill to</h3>
          <div>
            <div style={{ fontWeight: '500', fontSize: '12px', marginBottom: '2px' }}>
              {order.customer_name}
            </div>
            {formatBillingAddress(order.billing_address || order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} style={{ fontSize: '12px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {order.customer_email && (
              <div style={{ fontSize: '12px', color: '#374151', marginBottom: '1px' }}>
                Email: {order.customer_email}
              </div>
            )}
            {order.customer_phone && (
              <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '1px', fontWeight: '600' }}>
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
            fontSize: '16px',
            margin: '0 0 8px 0'
          }}>Ship to</h3>
          <div>
            <div style={{ fontWeight: '500', fontSize: '12px', marginBottom: '2px' }}>
              {order.customer_name}
            </div>
            {formatShippingAddress(order.shipping_address).slice(0, 4).map((line, index) => (
              <div key={index} style={{ fontSize: '12px', color: '#374151', marginBottom: '1px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div style={{ marginBottom: '24px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: '0',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #d1d5db' }}>
              <th style={{
                textAlign: 'left',
                padding: '8px 4px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '32px'
              }}>S.No</th>
              <th style={{
                textAlign: 'left',
                padding: '8px 4px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '48px'
              }}>Image</th>
              <th style={{
                textAlign: 'left',
                padding: '8px 4px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>Product</th>
              <th style={{
                textAlign: 'center',
                padding: '8px 4px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '64px'
              }}>Quantity</th>
              <th style={{
                textAlign: 'right',
                padding: '8px 4px',
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
                  <td style={{ padding: '8px 4px', color: '#374151' }}>{index + 1}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '13px', lineHeight: '1.3', marginBottom: '1px' }}>
                      ₹{(item.total || item.price || 0).toFixed(2)}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '12px', lineHeight: '1.3', marginBottom: '2px' }}>
                      {item.name || '4434 - Anarkali Kurtis - XL - 42'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.3' }}>
                      Measurements: {getVariationDisplay(item)}
                    </div>
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#374151' }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: '#374151' }}>
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 4px', color: '#374151' }}>1</td>
                <td style={{ padding: '8px 4px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#d1d5db',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '8px 4px' }}>
                  <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '12px', lineHeight: '1.3', marginBottom: '2px' }}>
                    4434 - Anarkali Kurtis - XL - 42
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.3' }}>
                    Measurements: XL - 42
                  </div>
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'center', color: '#374151' }}>1</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#374151' }}>0.5 kg</td>
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
          marginTop: '24px'
        }}>
          <img 
            src={barcodeDataUrl} 
            alt={`Barcode for ${order.order_number}`} 
            style={{ 
              maxWidth: '250px',
              height: 'auto'
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default PrintPackingSlipA5;
