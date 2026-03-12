
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
      width: '8.27in',
      minHeight: '11.69in',
      margin: '0',
      padding: '32px',
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
        marginBottom: '32px'
      }}>
        {/* Left: Company Name and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '22px',
            color: '#000'
          }}>{companySettings.company_name || 'Company'}</div>
          <span style={{ color: '#000', fontSize: '28px' }}>|</span>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#000',
            margin: '0'
          }}>Packing slip</h1>
        </div>

        {/* Right: Order Information */}
        <div style={{ textAlign: 'right', fontSize: '14px' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#000' }}>Order No.: </span>
            <span style={{ color: '#000' }}>{order.order_number}</span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#000' }}>Order Date: </span>
            <span style={{ color: '#000' }}>{formatDate(order.order_date)}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: '#000' }}>Shipping Method: </span>
            <span style={{ color: '#000' }}>{order.shipping_method || 'Standard Shipping'}</span>
          </div>
        </div>
      </div>

      {/* Address Section - Two Columns: From and To */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* From Address */}
        <div style={{ minWidth: 0, overflow: 'visible' }}>
          <h3 style={{
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '12px',
            fontSize: '18px',
            margin: '0 0 12px 0'
          }}>From</h3>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
              {companySettings.company_name || 'Company'}
            </div>
            {formatAddress(companySettings).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#000', marginBottom: '2px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {companySettings.phone && (
              <div style={{ fontSize: '14px', color: '#000', marginBottom: '2px' }}>
                +91 {companySettings.phone}
              </div>
            )}
          </div>
        </div>

        {/* To Address */}
        <div style={{ minWidth: 0, overflow: 'visible' }}>
          <h3 style={{
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '12px',
            fontSize: '18px',
            margin: '0 0 12px 0'
          }}>To</h3>
          <div style={{ minWidth: 0, overflow: 'visible' }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '4px', 
              fontSize: '14px',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              overflow: 'visible',
              width: '100%'
            }}>
              {order.customer_name}
            </div>
            {formatShippingAddress(order.shipping_address).map((line, index) => (
              <div key={index} style={{ fontSize: '14px', color: '#000', marginBottom: '2px', lineHeight: '1.4' }}>
                {line}
              </div>
            ))}
            {order.customer_email && (
              <div style={{ fontSize: '14px', color: '#000', marginBottom: '2px' }}>
                Email: {order.customer_email}
              </div>
            )}
            {order.customer_phone && (
              <div style={{ fontSize: '14px', color: '#000', marginBottom: '2px', fontWeight: '600' }}>
                Phone: {order.customer_phone}
              </div>
            )}
            {order.alternate_phone && (
              <div style={{ fontSize: '14px', color: '#000', marginBottom: '2px' }}>
                Alt Phone: {order.alternate_phone}
              </div>
            )}
            {order.whatsapp_number && (
              <div style={{ fontSize: '14px', color: '#000', marginBottom: '2px', fontWeight: '600' }}>
                WhatsApp: {order.whatsapp_number}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div style={{ marginBottom: '32px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: '0',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#000',
                width: '60px'
              }}>S.No</th>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#000',
                width: '80px'
              }}>Image</th>
              <th style={{
                textAlign: 'left',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#000'
              }}>Product</th>
              <th style={{
                textAlign: 'center',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#000',
                width: '80px'
              }}>Quantity</th>
              <th style={{
                textAlign: 'right',
                padding: '12px 8px',
                fontWeight: 'bold',
                color: '#000',
                width: '120px'
              }}>Total weight</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items && order.line_items.length > 0 ? (
              order.line_items.map((item: any, index: number) => {
                const itemImage = resolveLineItemImage(item);
                return (
                <tr key={index} style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '16px 8px', color: '#000' }}>{index + 1}</td>
                  <td style={{ padding: '16px 8px' }}>
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.name || 'Product'}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #000'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          ((e.target as HTMLImageElement).parentElement!.querySelector('.placeholder') as HTMLElement)!.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="placeholder" style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #000',
                      display: itemImage ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#000',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '2px', fontSize: '15px' }}>
                      ₹{(item.total || item.price || 0).toFixed(2)}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>
                      {item.name || '4434 - Anarkali Kurtis - XL - 42'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#000', lineHeight: '1.4' }}>
                      Measurements: {getVariationDisplay(item)}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'center', color: '#000' }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#000' }}>
                    {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                  </td>
                </tr>
              )})
            ) : (
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '16px 8px', color: '#000' }}>1</td>
                <td style={{ padding: '16px 8px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#000',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '16px 8px' }}>
                  <div style={{ fontWeight: '500', color: '#000', marginBottom: '4px' }}>
                    4434 - Anarkali Kurtis - XL - 42
                  </div>
                  <div style={{ fontSize: '14px', color: '#000', lineHeight: '1.4' }}>
                    Measurements: XL - 42
                  </div>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center', color: '#000' }}>1</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', color: '#000' }}>0.5 kg</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Barcode Section */}
      {barcodeDataUrl && (
        <div style={{
          textAlign: 'center',
          marginTop: '32px'
        }}>
          <img 
            src={barcodeDataUrl} 
            alt={`Barcode for ${order.order_number}`} 
            style={{ 
              maxWidth: '300px',
              height: 'auto'
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default PrintPackingSlipA4;
