
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Package, Phone, MapPin, User } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItem {
  name?: string;
  variant?: string;
  size?: string;
  quantity?: number;
}

interface OrderData {
  id?: string;
  customer?: string;
  amount?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  status?: string;
  items?: OrderItem[];
  orderId?: string;
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
  default_label_format: 'A4' | 'A5';
}

interface ShippingLabelPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrderData | null;
  onPrintComplete?: (orderId?: string) => void;
}

export const ShippingLabelPreview = ({ 
  isOpen, 
  onClose, 
  orderData, 
  onPrintComplete 
}: ShippingLabelPreviewProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const { user } = useAuth();

  // Load company settings
  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('company_settings' as any)
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setCompanySettings(data);
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }
    };

    if (user) {
      fetchCompanySettings();
    }
  }, [user]);

  // Centralized barcode text generation to ensure consistency
  const getBarcodeText = () => {
    return orderData?.id || orderData?.orderId || 'ORDER123';
  };

  // Centralized barcode configuration to ensure consistency
  const getBarcodeConfig = () => ({
    format: "CODE128",
    width: 3,
    height: 70,
    displayValue: false,
    fontSize: 14,
    margin: 5,
    background: "#ffffff",
    lineColor: "#000000"
  });

  // Generate barcode for preview
  useEffect(() => {
    const generateBarcode = async () => {
      if (barcodeRef.current && orderData) {
        try {
          const JsBarcode = (await import('jsbarcode')).default;
          const barcodeText = getBarcodeText();
          const config = getBarcodeConfig();
          
          barcodeRef.current.innerHTML = '';
          JsBarcode(barcodeRef.current, barcodeText, config);

        } catch (error) {
          console.error('Error generating barcode:', error);
          if (barcodeRef.current) {
            barcodeRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="monospace" font-size="12">${getBarcodeText()}</text>`;
          }
        }
      }
    };

    if (isOpen && orderData) {
      setTimeout(generateBarcode, 100);
    }
  }, [isOpen, orderData]);

  const handlePrint = async () => {
    console.log('🖨️ Print button clicked, starting print process...');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      console.log('✅ Print window opened successfully');
      
      const barcodeText = getBarcodeText();
      const barcodeConfig = getBarcodeConfig();
      
      const fromAddress = companySettings ? {
        name: companySettings.company_name || 'Your Company',
        line1: companySettings.address_line1 || '',
        line2: companySettings.address_line2 || '',
        city: companySettings.city || '',
        state: companySettings.state || '',
        postal: companySettings.postal_code || '',
        country: companySettings.country || '',
        phone: companySettings.phone || '',
        email: companySettings.email || ''
      } : {
        name: 'Your Company',
        line1: '123 Business Street',
        line2: 'Suite 100',
        city: 'Business City',
        state: 'State',
        postal: '12345',
        country: 'Country',
        phone: '+1 234 567 8900',
        email: 'info@company.com'
      };

      const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>Shipping Label - ${barcodeText}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: white; 
    }
    .shipping-label {
      border: 4px solid black;
      width: 4in;
      height: 6in;
      margin: 0 auto;
      background: white;
      font-size: 14px;
      display: flex;
      flex-direction: column;
    }
    .section { 
      border-bottom: 2px solid black;
      padding: 12px;
    }
    .barcode-section {
      text-align: center;
    }
    .barcode {
      margin-bottom: 8px;
    }
    .barcode svg {
      max-width: 100%;
      height: auto;
    }
    .barcode-text-large {
      font-weight: bold;
      font-size: 14px;
    }
    .to-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .red-dot {
      width: 8px;
      height: 8px;
      background: red;
      border-radius: 50%;
      margin-right: 8px;
    }
    .to-label, .from-label {
      font-weight: bold;
      font-size: 14px;
    }
    .customer-name {
      font-weight: bold;
      font-size: 18px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .address {
      font-size: 14px;
      line-height: 1.4;
    }
    .phone {
      font-size: 14px;
    }
    .from-section {
      padding: 12px;
    }
    .section-title {
      font-weight: bold; 
      font-size: 14px;
      margin-bottom: 8px;
    }
    .section-content {
      font-size: 14px;
      line-height: 1.4;
    }
    .products-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .product-item {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .footer {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      flex: 1;
      display: flex;
      align-items: center;
      justify-center;
      border: none;
    }
    .footer strong {
      color: black;
      font-weight: bold;
    }
    @media print {
      body { margin: 0; }
      .shipping-label { 
        border: 4px solid black;
        width: 4in;
        height: 6in;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
      }
      .footer {
        flex: 1;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="shipping-label">
    <div class="section barcode-section">
      <div class="barcode">
        <svg id="barcode-print"></svg>
      </div>
      <div class="barcode-text-large">${barcodeText}</div>
    </div>
    
    <div class="section">
      <div class="to-header">
        <div class="red-dot"></div>
        <span class="to-label">TO:</span>
      </div>
      <div class="customer-name">${orderData?.customer || 'Customer Name'}</div>
      <div class="address">${orderData?.address || 'Customer Address'}</div>
      <div class="address">${orderData?.city || 'City'}</div>
      <div class="address">${orderData?.country || 'Country'}</div>
      <div class="phone"><strong>Ph:</strong> ${orderData?.phone || 'Phone Number'}</div>
    </div>
    
    <div class="section from-section">
      <div class="section-title">FROM:</div>
      <div class="section-content">
        <div><strong>${fromAddress.name}</strong></div>
        <div>${fromAddress.line1}</div>
        ${fromAddress.line2 ? `<div>${fromAddress.line2}</div>` : ''}
        <div>${fromAddress.city}, ${fromAddress.state} ${fromAddress.postal}</div>
        <div>${fromAddress.country}</div>
        <div><strong>Ph:</strong> ${fromAddress.phone}</div>
        <div><strong>Email:</strong> ${fromAddress.email}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="products-title">PRODUCTS:</div>
      <div class="section-content">
        ${orderData?.items?.map(item => `
          <div class="product-item">
            • <strong>${item.name || 'Product'}</strong> 
            ${item.variant ? `- ${item.variant}` : ''} 
            ${item.size ? `/ ${item.size}` : ''} 
            (Qty: ${item.quantity || 1})
          </div>
        `).join('') || `
          <div class="product-item">• <strong>Product</strong> - Variant / Size (Qty: 1)</div>
        `}
      </div>
    </div>
    
    <div class="footer">
      <strong>Handle with Care - Thank you for your business!</strong>
    </div>
  </div>

  <script>
    console.log('🔧 Print page loaded, initializing barcode generation...');
    
    var BARCODE_TEXT = "${barcodeText}";
    var BARCODE_CONFIG = ${JSON.stringify(barcodeConfig)};
    
    function triggerPrint() {
      console.log('🖨️ Triggering print dialog...');
      try {
        window.print();
        console.log('✅ Print dialog opened');
        setTimeout(() => {
          console.log('🚪 Closing print window...');
          window.close();
        }, 1000);
      } catch (error) {
        console.error('❌ Error triggering print:', error);
        window.close();
      }
    }
    
    window.onload = function() {
      console.log('📄 Window loaded, checking for JsBarcode...');
      
      if (window.JsBarcode) {
        console.log('✅ JsBarcode loaded, generating barcode...');
        try {
          JsBarcode("#barcode-print", BARCODE_TEXT, BARCODE_CONFIG);
          console.log('✅ Barcode generated successfully');
        } catch (error) {
          console.error('❌ Error generating barcode:', error);
        }
      } else {
        console.error('❌ JsBarcode not loaded');
      }
      
      setTimeout(triggerPrint, 500);
    };
    
    document.addEventListener('DOMContentLoaded', function() {
      console.log('📄 DOM content loaded');
      if (!window.onload) {
        setTimeout(() => {
          if (window.JsBarcode) {
            JsBarcode("#barcode-print", BARCODE_TEXT, BARCODE_CONFIG);
          }
          triggerPrint();
        }, 500);
      }
    });
    
    setTimeout(() => {
      console.log('⏰ Fallback timer: ensuring print happens...');
      triggerPrint();
    }, 2000);
  </script>
</body>
</html>`;

      try {
        printWindow.document.write(printContent);
        printWindow.document.close();
        console.log('✅ Print content written to window');
        
        if (onPrintComplete) {
          onPrintComplete(orderData?.orderId);
        }
        onClose();
      } catch (error) {
        console.error('❌ Error writing print content:', error);
        printWindow.close();
      }
    } else {
      console.error('❌ Failed to open print window');
    }
  };

  if (!orderData) return null;

  const fromAddress = companySettings ? {
    name: companySettings.company_name || 'Your Company',
    line1: companySettings.address_line1 || '',
    line2: companySettings.address_line2 || '',
    city: companySettings.city || '',
    state: companySettings.state || '',
    postal: companySettings.postal_code || '',
    country: companySettings.country || '',
    phone: companySettings.phone || '',
    email: companySettings.email || ''
  } : {
    name: 'Your Company',
    line1: '123 Business Street',
    line2: 'Suite 100',
    city: 'Business City',
    state: 'State',
    postal: '12345',
    country: 'Country',
    phone: '+1 234 567 8900',
    email: 'info@company.com'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Shipping Label Preview - Order #{orderData.id}
          </DialogTitle>
        </DialogHeader>

        <div className="shipping-label bg-white border-4 border-black w-96 h-[576px] mx-auto text-sm flex flex-col font-sans">
          {/* Barcode Section */}
          <div className="border-b-2 border-black p-3 text-center flex flex-col justify-center items-center" style={{ height: '96px' }}>
            <div className="mb-2">
              <svg ref={barcodeRef} className="mx-auto max-w-full" width="280" height="70"></svg>
            </div>
            <div className="font-bold text-sm">{getBarcodeText()}</div>
          </div>

          {/* TO Section */}
          <div className="border-b-2 border-black p-3" style={{ height: '152px' }}>
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="font-bold text-sm">TO:</span>
            </div>
            <div className="font-bold text-lg uppercase mb-2">{orderData.customer || 'Customer Name'}</div>
            <div className="text-sm leading-tight space-y-0.5">
              <div>{orderData.address || 'Customer Address'}</div>
              <div>{orderData.city || 'City'}</div>
              <div>{orderData.country || 'Country'}</div>
              <div className="mt-2"><strong>Ph:</strong> {orderData.phone || 'Phone Number'}</div>
            </div>
          </div>

          {/* FROM Section */}
          <div className="border-b-2 border-black p-3" style={{ height: '120px' }}>
            <div className="font-bold text-sm mb-2">FROM:</div>
            <div className="text-sm leading-tight space-y-0.5">
              <div className="font-bold">{fromAddress.name}</div>
              <div>{fromAddress.line1}</div>
              {fromAddress.line2 && <div>{fromAddress.line2}</div>}
              <div>{fromAddress.city}, {fromAddress.state} {fromAddress.postal}</div>
              <div>{fromAddress.country}</div>
              <div><strong>Ph:</strong> {fromAddress.phone}</div>
              <div><strong>Email:</strong> {fromAddress.email}</div>
            </div>
          </div>

          {/* Products Section */}
          <div className="border-b-2 border-black p-3" style={{ height: '104px' }}>
            <div className="font-bold text-sm mb-2">PRODUCTS:</div>
            <div className="text-sm leading-tight overflow-y-auto" style={{ maxHeight: '64px' }}>
              {orderData.items && orderData.items.length > 0 ? (
                orderData.items.map((item, index) => (
                  <div key={index} className="mb-1">
                    • <strong>{item.name || 'Product'}</strong>
                    {item.variant ? ` - ${item.variant}` : ''}
                    {item.size ? ` / ${item.size}` : ''}
                    {` (Qty: ${item.quantity || 1})`}
                  </div>
                ))
              ) : (
                <div className="mb-1">
                  • <strong>Product</strong> - Variant / Size (Qty: 1)
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 text-center flex-1 flex items-center justify-center">
            <div className="font-bold text-xs">Handle with Care - Thank you for your business!</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
