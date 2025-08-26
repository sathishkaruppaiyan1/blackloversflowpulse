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
    const printStyles = `
      <style>
        @media print {
          body { 
            margin: 0; 
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .print-container { 
            width: 100%; 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
          }
          ${format === 'A5' ? `
            @page { size: A5; margin: 0.5in; }
            .print-container { max-width: 5.83in; }
          ` : `
            @page { size: A4; margin: 0.75in; }
            .print-container { max-width: 8.27in; }
          `}
          .print-hidden { display: none !important; }
        }
      </style>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Packing Slip - ${order.order_number}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${printStyles}
          </head>
          <body>
            <div class="print-container">
              ${document.querySelector(`[data-packing-slip-id="${order.id}"]`)?.innerHTML || ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
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