
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Package, User, Phone, MapPin, Printer, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PrintingPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);

  const loadProcessingOrders = async () => {
    if (!user) {
      toast.error('Please log in to view orders');
      return;
    }

    setLoading(true);
    try {
      console.log('📖 Loading processing orders from database...');
      const processingOrders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setOrders(processingOrders);
      setTotalOrders(processingOrders.length);
      console.log(`✅ Loaded ${processingOrders.length} processing orders`);
    } catch (error: any) {
      console.error('Error loading processing orders:', error);
      toast.error('Failed to load processing orders');
    } finally {
      setLoading(false);
    }
  };

  const syncFromWooCommerce = async () => {
    if (!user) {
      toast.error('Please log in to sync orders');
      return;
    }

    setSyncing(true);
    try {
      console.log('🔄 Starting WooCommerce sync...');
      await wooCommerceOrderService.syncOrdersFromWooCommerce();
      await loadProcessingOrders();
      toast.success('Successfully synced orders from WooCommerce');
    } catch (error: any) {
      console.error('Error syncing from WooCommerce:', error);
      toast.error(`Failed to sync orders: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = (order: WooCommerceOrder) => {
    console.log('Printing order:', order.order_number);
    toast.success(`Printing order ${order.order_number}`);
  };

  const moveToPackingStage = async (orderId: string) => {
    try {
      await wooCommerceOrderService.updateOrderStage(orderId, 'packing');
      await loadProcessingOrders(); // Refresh the list
      toast.success('Order moved to packing stage');
    } catch (error: any) {
      console.error('Error moving order to packing:', error);
      toast.error('Failed to move order to packing stage');
    }
  };

  // Load orders on component mount
  useEffect(() => {
    if (user) {
      loadProcessingOrders();
    }
  }, [user]);

  // Calculate pagination
  const totalPages = Math.ceil(totalOrders / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading processing orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Print Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and print orders that are ready for processing
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={syncFromWooCommerce}
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from WooCommerce'}
          </Button>
          <Button
            onClick={loadProcessingOrders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">orders per page</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, totalOrders)} of {totalOrders} orders
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {paginatedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Processing Orders</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are currently no orders in processing status. Orders will appear here when they're ready for printing.
            </p>
            <Button
              onClick={syncFromWooCommerce}
              disabled={syncing}
              className="mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from WooCommerce'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {paginatedOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Order #{order.order_number}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {order.items} items
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {order.status}
                    </Badge>
                    <Badge variant="outline">
                      {order.currency} {order.total.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <Separator />
              
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {order.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {order.customer_email}
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span className="font-medium">Phone:</span> {order.customer_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </h4>
                    <div className="text-sm">
                      {order.shipping_address || 'Address not available'}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Products
                    </h4>
                    <div className="space-y-2 text-sm">
                      {order.line_items && order.line_items.length > 0 ? (
                        order.line_items.map((item, index) => (
                          <div key={index} className="border-l-2 border-gray-200 pl-2">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-muted-foreground">
                              Qty: {item.quantity} | SKU: {item.sku || 'N/A'}
                            </div>
                            {(item.color || item.size) && (
                              <div className="text-muted-foreground text-xs">
                                {[item.color, item.size].filter(Boolean).join(' - ')}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No product details available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reseller Information */}
                {(order.reseller_name || order.reseller_number) && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-medium mb-2">Reseller Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {order.reseller_name && (
                          <div>
                            <span className="font-medium">Name:</span> {order.reseller_name}
                          </div>
                        )}
                        {order.reseller_number && (
                          <div>
                            <span className="font-medium">Number:</span> {order.reseller_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={() => handlePrint(order)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Order
                  </Button>
                  <Button
                    onClick={() => moveToPackingStage(order.id)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Move to Packing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
};

export default PrintingPage;
