import React from 'react';
import ShippingLabelPreview from './ShippingLabelPreview';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  total: number;
  items: number;
  line_items?: any[];
  tracking_number?: string;
  carrier?: string;
  status: string;
}

interface PrintableLabelProps {
  order: Order;
  format?: 'A4' | 'A5' | 'thermal';
  onPrint?: () => void;
}

const PrintableLabel: React.FC<PrintableLabelProps> = ({ order, format = 'A4', onPrint }) => {
  const handlePrint = () => {
    // Apply format-specific print styles
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; }
          .print-container { 
            width: 100%; 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
          }
          ${format === 'thermal' ? `
            @page { size: 4in 6in; margin: 0.1in; }
            .print-container { max-width: 4in; }
          ` : format === 'A5' ? `
            @page { size: A5; margin: 0.5in; }
          ` : `
            @page { size: A4; margin: 0.5in; }
          `}
        }
      </style>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Label - ${order.order_number}</title>
            <link href="https://cdn.tailwindcss.com/2.2.19/tailwind.min.css" rel="stylesheet">
            ${printStyles}
          </head>
          <body>
            <div class="print-container">
              ${document.querySelector(`[data-order-id="${order.id}"]`)?.innerHTML || ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        if (onPrint) onPrint();
      }, 250);
    }
  };

  return (
    <div>
      <div data-order-id={order.id}>
        <ShippingLabelPreview order={order} format={format} />
      </div>
      <div className="mt-4 text-center print:hidden">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
        >
          Print {format.toUpperCase()} Label
        </button>
      </div>
    </div>
  );
};

export default PrintableLabel;
