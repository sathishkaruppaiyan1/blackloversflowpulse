import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Package, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ShippingLabelPreview from './ShippingLabelPreview';
import { toast } from 'sonner';
import { PrintingFilters } from './PrintingFilters';
import { Database } from '@/integrations/supabase/types';

type OrderRow = Database['public']['Tables']['orders']['Row'];

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
  created_at: string;
}

const PrintingPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [allOrdersSelected, setAllOrdersSelected] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    date: "",
    status: "all",
    filterType: "all",
    product: "all",
    color: "all",
    size: "all",
  });
  const [sort, setSort] = useState({
    field: "date",
    direction: "desc"
  });
  const { user } = useAuth();

  // Extract unique values for filter options
  const getUniqueProducts = () => {
    const products = new Set<string>();
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (item.name) products.add(item.name);
        });
      }
    });
    return Array.from(products);
  };

  const getUniqueColors = () => {
    // This would depend on your data structure
    // For now, returning some common colors
    return ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink', 'Purple'];
  };

  const getUniqueSizes = () => {
    // This would depend on your data structure
    // For now, returning some common sizes
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  };

  useEffect(() => {
    fetchOrders();
  }, [filters, sort, user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*');

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.date) {
        const startDate = new Date(filters.date);
        const endDate = new Date(filters.date);
        endDate.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startDate.toISOString());
        query = query.lte('created_at', endDate.toISOString());
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: sort.direction === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } else {
        // Transform the data to match our Order interface
        const transformedOrders: Order[] = (data || []).map((order: OrderRow) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email || undefined,
          customer_phone: order.customer_phone || undefined,
          shipping_address: order.shipping_address || undefined,
          total: Number(order.total),
          items: order.items,
          line_items: Array.isArray(order.line_items) ? order.line_items : [],
          tracking_number: order.tracking_number || undefined,
          carrier: order.carrier || undefined,
          status: order.status,
          created_at: order.created_at,
        }));
        
        // Apply additional client-side filters
        let filteredOrders = transformedOrders;
        
        if (filters.product !== 'all') {
          filteredOrders = filteredOrders.filter(order => 
            order.line_items?.some(item => item.name === filters.product)
          );
        }

        setOrders(filteredOrders);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: any) => {
    setSort(newSort);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prevSelected) =>
      prevSelected.includes(orderId)
        ? prevSelected.filter((id) => id !== orderId)
        : [...prevSelected, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (allOrdersSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((order) => order.id));
    }
    setAllOrdersSelected(!allOrdersSelected);
  };

  const handlePrint = () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to print.');
      return;
    }

    // Open a new window with the ShippingLabelPreview for each selected order
    selectedOrders.forEach(async (orderId) => {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const componentString = `
            <html>
              <head>
                <title>Shipping Label - Order #${order.order_number}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: white; 
                  }
                  .container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    border: 2px solid #000; 
                    padding: 20px; 
                  }
                  .header { 
                    text-align: center; 
                    border-bottom: 2px solid #000; 
                    padding-bottom: 20px; 
                    margin-bottom: 20px; 
                  }
                  .section { 
                    margin-bottom: 20px; 
                  }
                  .section-title { 
                    font-weight: bold; 
                    font-size: 16px; 
                    margin-bottom: 10px; 
                    text-transform: uppercase; 
                  }
                  .address-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 30px; 
                  }
                  .address-box { 
                    border: 1px solid #ccc; 
                    padding: 15px; 
                    background: #f9f9f9; 
                  }
                  .product-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                  }
                  .product-table th, .product-table td { 
                    border: 1px solid #ccc; 
                    padding: 8px; 
                    text-align: left; 
                  }
                  .product-table th { 
                    background: #f0f0f0; 
                    font-weight: bold; 
                  }
                  .status-badge { 
                    display: inline-block; 
                    padding: 4px 12px; 
                    background: #007bff; 
                    color: white; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    text-transform: uppercase; 
                  }
                  @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .container { border: 2px solid #000; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">SHIPPING LABEL</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Order #${order.order_number}</p>
                    <div style="margin-top: 10px;">
                      <span class="status-badge">Status: ${order.status}</span>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-title">Shipping Information</div>
                    <div class="address-grid">
                      <div>
                        <strong>FROM:</strong>
                        <div class="address-box">
                          <div><strong>Your Company</strong></div>
                          <div>Your Company Address</div>
                          <div>City, State, PIN Code</div>
                          <div>Phone: +91 XXXXXXXXXX</div>
                        </div>
                      </div>
                      <div>
                        <strong>TO:</strong>
                        <div class="address-box">
                          <div><strong>${order.customer_name}</strong></div>
                          <div>${order.shipping_address || 'Address not provided'}</div>
                          ${order.customer_phone ? `<div><strong>Phone:</strong> ${order.customer_phone}</div>` : ''}
                          ${order.customer_email ? `<div><strong>Email:</strong> ${order.customer_email}</div>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-title">Product Details</div>
                    <table class="product-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Variation</th>
                          <th>Qty</th>
                          <th>Price (₹)</th>
                          <th>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${order.line_items && order.line_items.length > 0 ? 
                          order.line_items.map(item => `
                            <tr>
                              <td>${item.name || 'N/A'}</td>
                              <td>${item.sku || 'N/A'}</td>
                              <td>${item.variation || 'N/A'}</td>
                              <td>${item.quantity || 1}</td>
                              <td>₹${((item.price || 0)).toFixed(2)}</td>
                              <td>₹${((item.total || 0)).toFixed(2)}</td>
                            </tr>
                          `).join('') : 
                          `<tr>
                            <td colspan="6" style="text-align: center;">
                              ${order.items} item(s) - Total: ₹${order.total.toFixed(2)}
                            </td>
                          </tr>`
                        }
                      </tbody>
                      <tfoot>
                        <tr style="font-weight: bold; background: #f0f0f0;">
                          <td colspan="5" style="text-align: right;">Grand Total:</td>
                          <td>₹${order.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  ${(order.tracking_number || order.carrier) ? `
                    <div class="section">
                      <div class="section-title">Tracking Information</div>
                      <div class="address-box">
                        ${order.carrier ? `<div><strong>Carrier:</strong> ${order.carrier}</div>` : ''}
                        ${order.tracking_number ? `<div><strong>Tracking Number:</strong> ${order.tracking_number}</div>` : ''}
                      </div>
                    </div>
                  ` : ''}

                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
                    <p style="margin: 0; font-size: 12px; color: #666;">
                      Thank you for your business! Handle with care.
                    </p>
                  </div>
                </div>

                <script>
                  window.onload = function() {
                    window.print();
                    window.onafterprint = function() { 
                      window.close(); 
                    };
                  };
                </script>
              </body>
            </html>
          `;
          printWindow.document.write(componentString);
          printWindow.document.close();
        } else {
          toast.error('Failed to open print window. Please check your browser settings.');
        }
      }
    });

    setSelectedOrders([]);
    setAllOrdersSelected(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Print Shipping Labels</CardTitle>
        </CardHeader>
        <CardContent>
          <PrintingFilters 
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            products={getUniqueProducts()}
            colors={getUniqueColors()}
            sizes={getUniqueSizes()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders</CardTitle>
            <Button onClick={handlePrint} disabled={selectedOrders.length === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Print Selected Labels
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded text-blue-500 focus:ring-blue-500"
                        checked={allOrdersSelected}
                        onChange={handleSelectAllOrders}
                      />
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Total (₹)
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Order Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded text-blue-500 focus:ring-blue-500"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.customer_phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.items}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            order.status === 'processing'
                              ? 'secondary'
                              : order.status === 'completed'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {selectedOrders.includes(order.id) && (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintingPage;
