
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

interface PrintPackingSlipA4Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
}

const PrintPackingSlipA4: React.FC<PrintPackingSlipA4Props> = ({ 
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
    <div style={{
      width: '8.27in',
      minHeight: '11.69in',
      margin: '0',
      padding: '32px',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4',
      color: '#000'
    }}>
      {/* Header Section - Logo and Title on left, Order details on right */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px'
      }}>
        {/* Left: Logo and Packing slip title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '4px solid #ec4899',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                color: '#ec4899',
                fontWeight: 'bold',
                fontSize: '18px',
                lineHeight: '1.2'
              }}>Perfect</div>
              <div style={{
                color: '#ec4899',
                fontSize: '12px'
              }}>Collections</div>
            </div>
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0'
          }}>Packing slip</h1>
        </div>

        {/* Right: Order information */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order No.: </span>
            <span style={{ color: '#374151' }}>{order.order_number}</span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Order Date: </span>
            <span style={{ color: '#374151' }}>{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Shipping Method: </span>
            <span style={{ color: '#374151' }}>{order.shipping_method || 'Shipping Cost'}</span>
          </div>
        </div>
      </div>

      {/* Address Section - Three Columns exactly as in reference */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* From Address */}
        <div>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '12px',
            fontSize: '18px',
            margin: '0 0 12px 0'
          }}>From</h3>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {companySettings.company_name || 'Perfect Collections'}
            </div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                {line}
              </div>
            ))}
            {companySettings.phone && (
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
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
            marginBottom: '12px',
            fontSize: '18px',
            margin: '0 0 12px 0'
          }}>Bill to</h3>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {order.customer_name}
            </div>
            {formatBillingAddress(order.billing_address || order.shipping_address).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                {line}
              </div>
            ))}
            {order.customer_email && (
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                Email: {order.customer_email}
              </div>
            )}
            {order.customer_phone && (
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
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
            marginBottom: '12px',
            fontSize: '18px',
            margin: '0 0 12px 0'
          }}>Ship to</h3>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {order.customer_name}
            </div>
            {formatShippingAddress(order.shipping_address).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table - Exact columns as in reference */}
      <div style={{ marginBottom: '32px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: '0'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #d1d5db' }}>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '64px'
              }}>S.No</th>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '80px'
              }}>Image</th>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>Product</th>
              <th style={{
                textAlign: 'center',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '80px'
              }}>Quantity</th>
              <th style={{
                textAlign: 'right',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#1f2937',
                width: '128px'
              }}>Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.map((item: any, index: number) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 8px', color: '#374151' }}>{index + 1}</td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                      {item.name || '4434 - Anarkali Kurtis - XL - 42'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {item.variation ? `Measurements: ${item.variation}` : 'Measurements: XL - 42'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'center', color: '#374151' }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#374151' }}>
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              ))
            ) : (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px 8px', color: '#374151' }}>1</td>
                <td style={{ padding: '16px 8px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#d1d5db',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '16px 8px' }}>
                  <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                    4434 - Anarkali Kurtis - XL - 42
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Measurements: XL - 42
                  </div>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center', color: '#374151' }}>1</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', color: '#374151' }}>0.5 kg</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintPackingSlipA4;
