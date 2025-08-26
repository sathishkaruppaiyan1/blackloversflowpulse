import React, { useState, useEffect } from 'react';
import PackingSlipA4 from './PackingSlipA4';
import PackingSlipA5 from './PackingSlipA5';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
    if (user && !propFormat) {
      fetchDefaultFormat();
    }
  }, [user, propFormat]);

  const fetchDefaultFormat = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('default_label_format')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data && (data.default_label_format === 'A4' || data.default_label_format === 'A5')) {
        setDefaultFormat(data.default_label_format);
      }
    } catch (error: any) {
      console.error('Error fetching default format:', error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = document.querySelector(`[data-packing-slip-id="${order.id}"]`);
      
      const printStyles = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            margin: 0; 
            padding: 20px;
            font-family: Arial, sans-serif;
            background: white;
            color: black;
          }
          
          ${format === 'A5' ? `
            @page { 
              size: A5; 
              margin: 0.5in; 
            }
            .print-container { 
              max-width: 5.83in;
              width: 5.83in;
              min-height: 8.27in;
            }
          ` : `
            @page { 
              size: A4; 
              margin: 0.75in; 
            }
            .print-container { 
              max-width: 8.27in;
              width: 8.27in;
              min-height: 11.69in;
            }
          `}
          
          /* Recreate essential Tailwind styles for printing */
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-8 { margin-bottom: 2rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.5rem; }
          .mt-8 { margin-top: 2rem; }
          .mt-12 { margin-top: 3rem; }
          .p-4 { padding: 1rem; }
          .p-6 { padding: 1.5rem; }
          .p-8 { padding: 2rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
          .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
          .pt-3 { padding-top: 0.75rem; }
          .pt-4 { padding-top: 1rem; }
          .pb-3 { padding-bottom: 0.75rem; }
          
          /* Grid layouts */
          .grid { display: grid; }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .gap-3 { gap: 0.75rem; }
          .gap-6 { gap: 1.5rem; }
          
          /* Flexbox */
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          
          /* Spacing */
          .space-y-1 > * + * { margin-top: 0.25rem; }
          
          /* Colors */
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-900 { color: #111827; }
          
          /* Borders */
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .border-b-2 { border-bottom: 2px solid #e5e7eb; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .border-gray-200 { border-color: #e5e7eb; }
          .border-gray-300 { border-color: #d1d5db; }
          
          /* Table styles */
          table { 
            width: 100%; 
            border-collapse: collapse; 
            border-spacing: 0;
          }
          th { 
            font-weight: 600; 
            text-align: left;
            padding: 0.75rem 0.5rem;
            border-bottom: 2px solid #d1d5db;
          }
          td { 
            padding: 1rem 0.5rem; 
            border-bottom: 1px solid #e5e7eb;
          }
          
          /* Gradient background for logo */
          .gradient-bg {
            background: linear-gradient(135deg, #f472b6, #ec4899);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Responsive widths */
          .w-12 { width: 3rem; height: 3rem; }
          .w-16 { width: 4rem; height: 4rem; }
          .w-8 { width: 2rem; height: 2rem; }
          .w-9 { width: 2.25rem; height: 2.25rem; }
          .w-6 { width: 1.5rem; height: 1.5rem; }
          .bg-white { background-color: white; }
          .bg-pink-500 { background-color: #ec4899; }
          .bg-gray-200 { background-color: #e5e7eb; }
          .bg-gray-300 { background-color: #d1d5db; }
          .rounded-full { border-radius: 9999px; }
          .rounded { border-radius: 0.25rem; }
          .border { border: 1px solid #e5e7eb; }
          
          .print-hidden { display: none !important; }
          
          /* Ensure images print */
          img { 
            max-width: 100% !important; 
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        </style>
      `;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Packing Slip - ${order.order_number}</title>
            <meta charset="utf-8">
            ${printStyles}
          </head>
          <body>
            <div class="print-container">
              ${printContent?.innerHTML || ''}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
      
      // Close window after printing (optional)
      printWindow.addEventListener('afterprint', () => {
        printWindow.close();
      });
    }
  };

  return (
    <div className="w-full">
      <div data-packing-slip-id={order.id}>
        {format === 'A5' ? (
          <PackingSlipA5 order={order} />
        ) : (
          <PackingSlipA4 order={order} />
        )}
      </div>
      
      {showPrintButton && (
        <div className="mt-6 text-center print-hidden">
          <Button
            onClick={handlePrint}
            className="bg-navy-600 hover:bg-navy-700 text-white px-8 py-2 rounded-lg font-medium"
            style={{ backgroundColor: '#1e3a8a' }}
          >
            Print {format} Packing Slip
          </Button>
        </div>
      )}
    </div>
  );
};

export default PackingSlipTemplate;