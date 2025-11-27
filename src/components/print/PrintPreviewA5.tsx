import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface PrintPreviewA5Props {
  order: Order;
  companySettings: CompanySettings;
  barcodeDataUrl?: string;
  onPrint: () => void;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 6; // Maximum items that fit on one A5 page

const PrintPreviewA5: React.FC<PrintPreviewA5Props> = ({
  order,
  companySettings,
  barcodeDataUrl,
  onPrint,
  onClose
}) => {
  const [currentPreviewPage, setCurrentPreviewPage] = React.useState(0);

  // Calculate how many pages this order will take
  const totalPages = useMemo(() => {
    const itemCount = order.line_items?.length || 1;
    return Math.ceil(itemCount / ITEMS_PER_PAGE);
  }, [order.line_items]);

  // Split items into pages
  const pageItems = useMemo(() => {
    const items = order.line_items || [];
    const pages: any[][] = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      pages.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [order.line_items]);

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

  const formatBillingAddress = (address?: string, postcode?: string, city?: string, state?: string) => {
    if (!address) return ['No billing address provided'];
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    return new Date(dateString).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const renderPage = (pageIndex: number) => {
    const items = pageItems[pageIndex];
    const startItemNumber = pageIndex * ITEMS_PER_PAGE + 1;

    return (
      <div 
        key={pageIndex}
        className="relative bg-white border-2 border-dashed border-primary/30 rounded-lg p-4 shadow-lg"
        style={{
          width: '420px',
          minHeight: '594px',
          margin: '0 auto'
        }}
      >
        {/* Page indicator badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-md z-10">
          Page {pageIndex + 1} of {totalPages}
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-3 gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-14 h-14 rounded-full border-2 border-pink-500 flex items-center justify-center bg-white flex-shrink-0">
                <div className="text-center">
                  <div className="text-pink-500 font-bold text-sm leading-tight">Perfect</div>
                  <div className="text-pink-500 text-xs">Collections</div>
                </div>
              </div>
              <h1 className="text-lg font-bold text-gray-800">Packing slip</h1>
            </div>
          </div>
          
          <div className="text-xs text-left flex-shrink-0">
            <div className="mb-0.5">
              <span className="font-bold text-gray-800">Order No.: </span>
              <span className="text-gray-600">{order.order_number || order.id || 'N/A'}</span>
            </div>
            <div className="mb-0.5">
              <span className="font-bold text-gray-800">Date: </span>
              <span className="text-gray-600">{formatDate(order.order_date)}</span>
            </div>
            <div>
              <span className="font-bold text-gray-800">Method: </span>
              <span className="text-gray-600">{order.shipping_method || 'Standard Shipping'}</span>
            </div>
          </div>
        </div>

        {/* Address Section - Only on first page */}
        {pageIndex === 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
            <div>
              <h3 className="font-bold text-gray-800 mb-1.5 text-sm">From</h3>
              <div className="font-medium text-xs mb-0.5">{companySettings.company_name || 'Perfect Collections'}</div>
              {formatAddress(companySettings).map((line, index) => (
                <div key={index} className="text-xs text-gray-600 mb-0.5 leading-tight">{line}</div>
              ))}
              {companySettings.phone && (
                <div className="text-xs text-gray-600">+91 {companySettings.phone}</div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-1.5 text-sm">Bill to</h3>
              <div className="font-medium text-xs mb-0.5">{order.customer_name}</div>
              {formatBillingAddress(
                order.billing_address || order.shipping_address,
                order.billing_postcode || order.shipping_postcode,
                order.billing_city || order.shipping_city,
                order.billing_state || order.shipping_state
              ).map((line, index) => (
                <div key={index} className="text-xs text-gray-600 mb-0.5 leading-tight">{line}</div>
              ))}
              {order.customer_phone && (
                <div className="text-xs text-blue-600 font-semibold">Phone: {order.customer_phone}</div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-1.5 text-sm">Ship to</h3>
              <div className="font-medium text-xs mb-0.5">{order.customer_name}</div>
              {formatShippingAddress(
                order.shipping_address,
                order.shipping_postcode,
                order.shipping_city,
                order.shipping_state
              ).map((line, index) => (
                <div key={index} className="text-xs text-gray-600 mb-0.5 leading-tight">{line}</div>
              ))}
            </div>
          </div>
        )}

        {pageIndex > 0 && (
          <div className="mb-3 text-center text-xs text-muted-foreground italic">
            Order #{order.order_number} - Continued
          </div>
        )}

        {/* Product Table */}
        <div className="mb-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-1 px-0.5 font-bold text-gray-800 w-8">S.No</th>
                <th className="text-left py-1 px-0.5 font-bold text-gray-800">Product</th>
                <th className="text-center py-1 px-0.5 font-bold text-gray-800 w-16">Quantity</th>
                <th className="text-right py-1 px-0.5 font-bold text-gray-800 w-20">Total weight</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-1 px-0.5 text-gray-600">{startItemNumber + index}</td>
                    <td className="py-1 px-0.5">
                      <div className="font-bold text-gray-800 text-[10px] leading-tight mb-0.5">
                        ₹{(item.total || item.price || 0).toFixed(2)}
                      </div>
                      <div className="font-bold text-gray-800 text-xs leading-tight">
                        {item.name || 'Product'}
                      </div>
                    </td>
                    <td className="py-1 px-0.5 text-center text-gray-600">{item.quantity || 1}</td>
                    <td className="py-1 px-0.5 text-right text-gray-600">
                      {((parseFloat(item.weight || '0.5') * (item.quantity || 1))).toFixed(1)} kg
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-1 px-0.5 text-gray-600">1</td>
                  <td className="py-1 px-0.5">
                    <div className="font-medium text-gray-800 text-xs leading-tight">Sample Product</div>
                  </td>
                  <td className="py-1 px-0.5 text-center text-gray-600">1</td>
                  <td className="py-1 px-0.5 text-right text-gray-600">0.5 kg</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barcode Section - Only on last page */}
        {pageIndex === totalPages - 1 && barcodeDataUrl && (
          <div className="text-center mt-2">
            <img 
              src={barcodeDataUrl} 
              alt={`Barcode for ${order.order_number || order.id || ''}`}
              className="mx-auto max-w-[200px] h-auto"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Print Preview</h2>
            <p className="text-sm text-muted-foreground">
              Order #{order.order_number} will print on {totalPages} page{totalPages > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onPrint} size="sm" className="gap-2">
              <Printer className="w-4 h-4" />
              Print Now
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          <div className="space-y-8">
            {totalPages === 1 ? (
              renderPage(0)
            ) : (
              <>
                {/* Show current page in navigation mode */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                    disabled={currentPreviewPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Preview Page {currentPreviewPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPreviewPage(Math.min(totalPages - 1, currentPreviewPage + 1))}
                    disabled={currentPreviewPage === totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {renderPage(currentPreviewPage)}
              </>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t bg-muted/30 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <div>
              <strong>{order.line_items?.length || 0}</strong> product{(order.line_items?.length || 0) !== 1 ? 's' : ''} 
              {' '}• Split across <strong>{totalPages}</strong> page{totalPages > 1 ? 's' : ''}
            </div>
            <div className="text-xs">
              Each page shows up to {ITEMS_PER_PAGE} products
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewA5;
