import React, { useState, useEffect } from 'react';
import DisplayPackingSlipA4 from './display/DisplayPackingSlipA4';
import DisplayPackingSlipA5 from './display/DisplayPackingSlipA5';
import PrintPackingSlipA4 from './print/PrintPackingSlipA4';
import PrintPackingSlipA5 from './print/PrintPackingSlipA5';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import JsBarcode from 'jsbarcode';

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

interface PackingSlipTemplateProps {
  order?: Order;
  format?: 'A4' | 'A5';
  showPrintButton?: boolean;
}

const PackingSlipTemplate: React.FC<PackingSlipTemplateProps> = ({ 
  order: propOrder, 
  format: propFormat,
  showPrintButton = true 
}) => {
  const [defaultFormat, setDefaultFormat] = useState<'A4' | 'A5'>('A4');
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const { user } = useAuth();

  // Sample order data for preview
  const sampleOrder: Order = {
    id: '69478',
    order_number: '69478',
    customer_name: 'Vidhya D',
    customer_email: 'vidhya@example.com',
    customer_phone: '+91 9876543210',
    shipping_address: 'Chennai, Tamil Nadu, 600001, India',
    billing_address: 'Chennai, Tamil Nadu, 600001, India',
    total: 1299.99,
    items: 1,
    line_items: [
      {
        name: 'Anarkali Kurtis',
        variation: 'XL - 42',
        quantity: 1,
        weight: '0.5',
        sku: 'ANK-XL-42',
        price: 1299.99,
        total: 1299.99
      }
    ],
    order_date: '2025-08-26',
    shipping_method: 'Standard Delivery',
    shipping_cost: 50
  };

  const order = propOrder || sampleOrder;
  const format = propFormat || defaultFormat;

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    generateBarcode();
  }, [order.order_number]);

  // Listen for settings changes (including format changes)
  useEffect(() => {
    if (!propFormat && user) {
      const interval = setInterval(fetchSettings, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [user, propFormat]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanySettings({
          company_name: data.company_name || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          phone: data.phone || '',
          email: data.email || ''
        });

        if (data.default_label_format && (data.default_label_format === 'A4' || data.default_label_format === 'A5')) {
          if (data.default_label_format !== defaultFormat) {
            console.log('Format updated:', data.default_label_format);
            setDefaultFormat(data.default_label_format);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBarcode = () => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, order.order_number, {
        format: "CODE128",
        width: format === 'A5' ? 1.5 : 2,
        height: format === 'A5' ? 40 : 60,
        displayValue: true,
        fontSize: format === 'A5' ? 10 : 14,
        margin: format === 'A5' ? 5 : 10,
        background: "#ffffff",
        lineColor: "#000000"
      });
      setBarcodeDataUrl(canvas.toDataURL());
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Create a temporary container to render the print component
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);

    // Render the appropriate print component
    const PrintComponent = format === 'A5' ? PrintPackingSlipA5 : PrintPackingSlipA4;
    
    // Create React element and render to HTML
    import('react-dom/server').then((ReactDOMServer) => {
      const printElement = React.createElement(PrintComponent, {
        order,
        companySettings,
        barcodeDataUrl
      });

      const printHTML = ReactDOMServer.renderToString(printElement);

      const pageStyles = `
        <style>
          @page {
            ${format === 'A5' ? 'size: A5; margin: 0.5in;' : 'size: A4; margin: 0.75in;'}
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            color: black;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          img {
            max-width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-hidden {
            display: none !important;
          }
        </style>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Packing Slip - ${order.order_number}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            ${pageStyles}
          </head>
          <body>
            ${printHTML}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1500);

      // Close window after printing
      printWindow.addEventListener('afterprint', () => {
        printWindow.close();
      });

      // Clean up
      document.body.removeChild(tempDiv);
    }).catch((error) => {
      console.error('Error loading ReactDOMServer:', error);
      // Fallback: simple print without server-side rendering
      simplePrint(printWindow);
      document.body.removeChild(tempDiv);
    });
  };

  const simplePrint = (printWindow: Window) => {
    const PrintComponent = format === 'A5' ? PrintPackingSlipA5 : PrintPackingSlipA4;
    const printHTML = `
      <div id="print-root"></div>
      <script>
        // Fallback print method
        window.print();
      </script>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing Slip - ${order.order_number}</title>
          <meta charset="utf-8">
          <style>
            @page { ${format === 'A5' ? 'size: A5; margin: 0.5in;' : 'size: A4; margin: 0.75in;'} }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${printHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading template...</div>;
  }

  return (
    <div className="w-full">
      <div data-packing-slip-id={order.id}>
        {format === 'A5' ? (
          <DisplayPackingSlipA5 
            order={order} 
            companySettings={companySettings}
            barcodeDataUrl={barcodeDataUrl}
          />
        ) : (
          <DisplayPackingSlipA4 
            order={order} 
            companySettings={companySettings}
            barcodeDataUrl={barcodeDataUrl}
          />
        )}
      </div>
      
      {showPrintButton && (
        <div className="mt-6 text-center print-hidden space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={handlePrint}
              className="bg-navy-600 hover:bg-navy-700 text-white px-8 py-2 rounded-lg font-medium"
              style={{ backgroundColor: '#1e3a8a' }}
            >
              Print {format} Packing Slip
            </Button>
            {!propFormat && (
              <Button
                onClick={() => {
                  setLoading(true);
                  fetchSettings();
                }}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Refresh Format
              </Button>
            )}
          </div>
          {!propFormat && (
            <p className="text-xs text-gray-500">
              Current format: {format} • Updates automatically every 3 seconds
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PackingSlipTemplate;