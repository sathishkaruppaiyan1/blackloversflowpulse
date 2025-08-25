
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintingFilters } from './PrintingFilters';
import { PrintingOrderCard } from './PrintingOrderCard';

const PrintingPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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
      setFilteredOrders(processingOrders);
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
      await loadProcessingOrders();
      toast.success('Order moved to packing stage');
    } catch (error: any) {
      console.error('Error moving order to packing:', error);
      toast.error('Failed to move order to packing stage');
    }
  };

  const handleFiltersChange = (filters: any) => {
    let filtered = [...orders];

    // Apply product filter
    if (filters.product) {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.name.toLowerCase().includes(filters.product.toLowerCase())
        )
      );
    }

    // Apply color filter
    if (filters.color) {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.color?.toLowerCase().includes(filters.color.toLowerCase())
        )
      );
    }

    // Apply size filter
    if (filters.size) {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.size?.toLowerCase().includes(filters.size.toLowerCase())
        )
      );
    }

    // Apply date filter
    if (filters.orderDate) {
      const filterDate = filters.orderDate.toISOString().split('T')[0];
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === filterDate;
      });
    }

    // Apply sorting
    switch (filters.sortOrder) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'amount_high':
        filtered.sort((a, b) => b.total - a.total);
        break;
      case 'amount_low':
        filtered.sort((a, b) => a.total - b.total);
        break;
    }

    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle order selection
  const handleOrderSelect = (orderId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedOrderIds);
    if (checked) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    setSelectedOrderIds(newSelectedIds);
    setSelectAll(newSelectedIds.size === paginatedOrders.length);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedOrders.map(order => order.id));
      setSelectedOrderIds(allIds);
      setSelectAll(true);
    } else {
      setSelectedOrderIds(new Set());
      setSelectAll(false);
    }
  };

  // Load orders on component mount
  useEffect(() => {
    if (user) {
      loadProcessingOrders();
    }
  }, [user]);

  // Calculate pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
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
      {/* Header */}
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

      {/* Smart Filtering */}
      <PrintingFilters onFiltersChange={handleFiltersChange} totalOrders={totalOrders} />

      {/* Orders Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Orders for Printing</CardTitle>
              <p className="text-sm text-muted-foreground">
                {totalOrders} orders match your filter criteria
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">
                  {selectedOrderIds.size > 0 ? (
                    <>
                      <Button variant="link" className="p-0 h-auto text-sm">
                        Select All
                      </Button>
                      <span className="mx-2">|</span>
                      <Button variant="link" className="p-0 h-auto text-sm">
                        Unselect All
                      </Button>
                    </>
                  ) : (
                    'Select All'
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                No orders match your current filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {paginatedOrders.map((order) => (
                <PrintingOrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderIds.has(order.id)}
                  onSelect={(checked) => handleOrderSelect(order.id, checked)}
                  onPrint={() => handlePrint(order)}
                  onMoveToPacking={() => moveToPackingStage(order.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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
      )}
    </div>
  );
};

export default PrintingPage;
