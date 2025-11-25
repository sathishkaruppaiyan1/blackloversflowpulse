
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';

export interface CSVExportOrder {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  reseller_name: string;
  reseller_number: string;
  total: string;
  items: string;
  carrier: string;
  tracking_number: string;
  shipping_address: string;
  status: string;
  created_at: string;
  shipped_at: string;
  delivered_at: string;
}

export const exportOrdersToCSV = (orders: WooCommerceOrder[], filename: string = 'shipped-orders.csv') => {
  if (orders.length === 0) {
    console.warn('No orders to export');
    return;
  }

  // Convert orders to CSV format
  const csvData: CSVExportOrder[] = orders.map(order => ({
    order_number: order.order_number || '',
    customer_name: order.customer_name || '',
    customer_email: order.customer_email || '',
    customer_phone: order.customer_phone || '',
    reseller_name: order.reseller_name || '',
    reseller_number: order.reseller_number || '',
    total: order.total ? `₹${order.total.toFixed(2)}` : '₹0.00',
    items: order.items ? order.items.toString() : '0',
    carrier: order.carrier || '',
    tracking_number: order.tracking_number || '',
    shipping_address: order.shipping_address || '',
    status: order.status || '',
    created_at: order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '',
    shipped_at: order.shipped_at ? new Date(order.shipped_at).toLocaleDateString('en-IN') : '',
    delivered_at: order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('en-IN') : ''
  }));

  // Create CSV headers
  const headers = [
    'Order Number',
    'Customer Name', 
    'Customer Email',
    'Customer Phone',
    'Reseller Name',
    'Reseller Number',
    'Total Amount',
    'Items Count',
    'Carrier',
    'Tracking Number',
    'Shipping Address',
    'Status',
    'Order Date',
    'Shipped Date',
    'Delivered Date'
  ];

  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => [
      `"${row.order_number}"`,
      `"${row.customer_name}"`,
      `"${row.customer_email}"`,
      `"${row.customer_phone}"`,
      `"${row.reseller_name}"`,
      `"${row.reseller_number}"`,
      `"${row.total}"`,
      `"${row.items}"`,
      `"${row.carrier}"`,
      `"${row.tracking_number}"`,
      `"${row.shipping_address.replace(/"/g, '""')}"`, // Escape quotes in address
      `"${row.status}"`,
      `"${row.created_at}"`,
      `"${row.shipped_at}"`,
      `"${row.delivered_at}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  console.log(`✅ Exported ${orders.length} orders to ${filename}`);
};
