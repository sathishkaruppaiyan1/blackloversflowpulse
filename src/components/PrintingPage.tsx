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
          // Render the ShippingLabelPreview component to a string
          const componentString = `
            <html>
              <head>
                <title>Shipping Label - Order #${order.order_number}</title>
                <style>
                  body { font-family: Arial, sans-serif; }
                  @media print {
                    body { -webkit-print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                <div id="print-root"></div>
                <script>
                  function renderReactComponent() {
                    const root = document.getElementById('print-root');
                    root.innerHTML = \`<div class="w-full max-w-4xl mx-auto p-6 bg-white border-2 border-gray-300 print:border-none print:shadow-none">
                      {/* Header */}
                      <div class="text-center mb-6 pb-4 border-b-2 border-gray-200">
                        <h1 class="text-2xl font-bold text-gray-800">SHIPPING LABEL</h1>
                        <p class="text-sm text-gray-600 mt-1">Order #${order.order_number}</p>
                      </div>

                      {/* From and To Addresses */}
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        {/* FROM Address */}
                        <div class="space-y-3">
                          <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="w-4 h-4 text-white" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                            </div>
                            <h2 class="text-lg font-semibold text-gray-800">FROM</h2>
                          </div>
                          
                          <div class="bg-gray-50 p-4 rounded-lg border">
                            <div class="font-semibold text-gray-800 mb-2">
                              Your Company
                            </div>
                            <div class="text-sm text-gray-600 whitespace-pre-line">
                              Street address\\nCity, State Postal Code\\nCountry
                            </div>
                            <div class="text-sm text-gray-600 mt-2">
                              Phone: +1 234 567 8900
                            </div>
                            <div class="text-sm text-gray-600">
                              Email: company@example.com
                            </div>
                          </div>
                        </div>

                        {/* TO Address */}
                        <div class="space-y-3">
                          <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="w-4 h-4 text-white" viewBox="0 0 16 16"><path d="M11 1a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-2zm-3 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H6zM2 1a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2z"/></svg>
                            </div>
                            <h2 class="text-lg font-semibold text-gray-800">TO</h2>
                          </div>
                          
                          <div class="bg-gray-50 p-4 rounded-lg border">
                            <div class="font-semibold text-gray-800 mb-2">
                              ${order.customer_name}
                            </div>
                            <div class="text-sm text-gray-600 whitespace-pre-line mb-2">
                              ${order.shipping_address ? order.shipping_address.replace(/,\\s*/g, '\\n') : 'No shipping address provided'}
                            </div>
                            <div class="text-sm text-gray-600">
                              Phone: ${order.customer_phone || 'N/A'}
                            </div>
                            <div class="text-sm text-gray-600">
                              Email: ${order.customer_email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div class="mb-6">
                        <div class="flex items-center gap-2 mb-3">
                          <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="w-4 h-4 text-white" viewBox="0 0 16 16"><path d="M1 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H1zm14 1H2v11h12V3zm-2.5 2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h5zm0 3a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h5zm0 3a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h5z"/></svg>
                          </div>
                          <h2 class="text-lg font-semibold text-gray-800">PRODUCTS</h2>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg border">
                          <div class="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 mb-2 pb-2 border-b border-gray-200">
                            <span>Items</span>
                            <span>Quantity</span>
                            <span>Total</span>
                          </div>
                          
                          ${order.line_items && order.line_items.length > 0 ? order.line_items.map((item, index) => `
                            <div key=\${index} class="grid grid-cols-3 gap-4 text-sm text-gray-600 py-1">
                              <span>\${item.name}</span>
                              <span>\${item.quantity}</span>
                              <span>$\${(item.total || 0).toFixed(2)}</span>
                            </div>
                          `).join('') : `
                            <div class="text-sm text-gray-600">
                              \${order.items} item(s) - Total: $\${order.total.toFixed(2)}
                            </div>
                          `}
                        </div>
                      </div>

                      {/* Tracking Information */}
                      ${(order.tracking_number || order.carrier) ? `
                        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 class="font-semibold text-blue-800 mb-2">Tracking Information</h3>
                          <div class="space-y-1 text-sm text-blue-700">
                            ${order.carrier ? `
                              <div>
                                <span class="font-medium">Carrier:</span> \${order.carrier}
                              </div>
                            ` : ''}
                            ${order.tracking_number ? `
                              <div>
                                <span class="font-medium">Tracking Number:</span> \${order.tracking_number}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      ` : ''}

                      {/* Footer */}
                      <div class="text-center pt-4 border-t-2 border-gray-200">
                        <p class="text-xs text-gray-500">
                          Thank you for your business! Handle with care.
                        </p>
                      </div>
                    </div>\`;
                    window.print();
                    window.onafterprint = function(){ window.close()};
                  }
                  window.onload = renderReactComponent;
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

    // Optionally, clear selected orders after printing
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
              Print Selected
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
                      Total
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                        ${order.total.toFixed(2)}
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
