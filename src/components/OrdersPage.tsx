
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Download, Settings, Eye, Package, User, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';

interface OrderDetails {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  billing_address?: {
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  status: string;
  created_at: string;
  payment_method?: string;
  shipping_method?: string;
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { user } = useAuth();

  // Load all orders from database
  const loadAllOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('📖 Loading all orders from database...');
      const fetchedOrders = await wooCommerceOrderService.fetchOrders();
      setOrders(fetchedOrders);
      console.log(`✅ Loaded ${fetchedOrders.length} orders`);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Sync from WooCommerce and refresh all orders
  const syncAndRefresh = async () => {
    if (!user) {
      toast.error('Please log in to sync orders');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Syncing from WooCommerce...');
      await wooCommerceOrderService.syncOrdersFromWooCommerce();
      await loadAllOrders();
      toast.success('Orders synced successfully');
    } catch (error: any) {
      console.error('Error syncing orders:', error);
      toast.error(`Failed to sync orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-500 text-white';
      case 'processing':
        return 'bg-blue-500 text-white';
      case 'packing':
        return 'bg-orange-500 text-white';
      case 'packed':
        return 'bg-purple-500 text-white';
      case 'shipped':
        return 'bg-indigo-500 text-white';
      case 'on-hold':
        return 'bg-yellow-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'refunded':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePreviewOrder = async (order: WooCommerceOrder) => {
    console.log('👁️ Previewing order:', order.order_number);
    
    setPreviewLoading(true);
    try {
      // Create order details from the database order
      const orderDetails: OrderDetails = {
        id: parseInt(order.id),
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        billing_address: {
          // We don't have detailed billing address in our current structure
          // but we have shipping address
          address_1: order.shipping_address || '',
        },
        items: order.line_items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price || '0'),
          total: parseFloat(item.total || '0')
        })) || [],
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        payment_method: 'Not available',
        shipping_method: 'Not available',
      };
      
      setSelectedOrder(orderDetails);
      setIsPreviewOpen(true);
      toast.success('Order details loaded');
    } catch (err) {
      console.error('Error in handlePreviewOrder:', err);
      toast.error('Failed to load order details');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Load orders on component mount
  useEffect(() => {
    if (user) {
      loadAllOrders();
    }
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track your WooCommerce orders from all stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={syncAndRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync from WooCommerce'}
          </Button>
        </div>
      </div>

      {orders.length === 0 && !loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Orders Found</h3>
                <p className="text-muted-foreground">
                  Configure your WooCommerce settings and sync your orders to get started
                </p>
              </div>
              <Button onClick={syncAndRefresh} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewOrder(order)}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Order Details Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order #{selectedOrder?.order_number} Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(selectedOrder.total)}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedOrder.customer_email}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedOrder.billing_address && selectedOrder.billing_address.address_1 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Address</p>
                      <div className="bg-muted p-3 rounded-lg">
                        <p>{selectedOrder.billing_address.address_1}</p>
                        {selectedOrder.billing_address.address_2 && (
                          <p>{selectedOrder.billing_address.address_2}</p>
                        )}
                        {selectedOrder.billing_address.city && (
                          <p>
                            {selectedOrder.billing_address.city}, {selectedOrder.billing_address.state} {selectedOrder.billing_address.postcode}
                          </p>
                        )}
                        {selectedOrder.billing_address.country && (
                          <p>{selectedOrder.billing_address.country}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No items found for this order
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Payment & Shipping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedOrder.payment_method && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedOrder.payment_method}</p>
                    </CardContent>
                  </Card>
                )}
                
                {selectedOrder.shipping_method && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Shipping Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedOrder.shipping_method}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Loading order details...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
