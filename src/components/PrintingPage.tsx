import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PrintingFilters } from './PrintingFilters';
import PrintingOrderCard from './PrintingOrderCard';

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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleBulkPrint = () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
    console.log('Bulk printing orders:', selectedOrders.map(o => o.order_number));
    toast.success(`Printing ${selectedOrders.length} selected orders`);
    
    // Clear selection after printing
    setSelectedOrderIds(new Set());
    setSelectAll(false);
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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query) ||
        order.shipping_address?.toLowerCase().includes(query) ||
        order.line_items?.some(item => 
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query)
        )
      );
    }

    // Apply product filter
    if (filters.product && filters.product !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.name.toLowerCase().includes(filters.product.toLowerCase())
        )
      );
    }

    // Apply color filter
    if (filters.color && filters.color !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.color?.toLowerCase().includes(filters.color.toLowerCase())
        )
      );
    }

    // Apply size filter
    if (filters.size && filters.size !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.size?.toLowerCase().includes(filters.size.toLowerCase())
        )
      );
    }

    // Apply variation filter - check against variation_id or create combined variation from available properties
    if (filters.variation && filters.variation !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => {
          // Check variation_id if it exists
          if (item.variation_id && item.variation_id.toString().includes(filters.variation)) {
            return true;
          }
          // Check against weight or other meta properties
          if (item.weight?.toLowerCase().includes(filters.variation.toLowerCase())) {
            return true;
          }
          // Check meta_data for variation information
          if (item.meta_data && Array.isArray(item.meta_data)) {
            return item.meta_data.some(meta => 
              meta.value?.toString().toLowerCase().includes(filters.variation.toLowerCase())
            );
          }
          return false;
        })
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

  // Apply filters when search query changes
  useEffect(() => {
    handleFiltersChange({});
  }, [searchQuery]);

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

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by order number, customer name, phone, email, address, product name, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Orders for Printing</CardTitle>
              <p className="text-sm text-muted-foreground">
                {totalOrders} orders match your filter criteria
                {selectedOrderIds.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {selectedOrderIds.size} selected
                  </span>
                )}
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
                      <Button variant="link" className="p-0 h-auto text-sm" onClick={() => handleSelectAll(true)}>
                        Select All
                      </Button>
                      <span className="mx-2">|</span>
                      <Button variant="link" className="p-0 h-auto text-sm" onClick={() => handleSelectAll(false)}>
                        Unselect All
                      </Button>
                    </>
                  ) : (
                    'Select All'
                  )}
                </span>
              </div>
              {selectedOrderIds.size > 0 && (
                <Button
                  onClick={handleBulkPrint}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Printer className="h-4 w-4" />
                  Print {selectedOrderIds.size} Labels
                </Button>
              )}
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
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <div className="font-semibold text-sm text-gray-700">Order Number</div>
                      <div className="text-xs text-gray-500">Customer</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-semibold text-sm text-gray-700">Product Details</div>
                      <div className="text-xs text-gray-500">Variations</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-semibold text-sm text-gray-700">Order Info</div>
                      <div className="text-xs text-gray-500">Weight / Amount / Date</div>
                    </div>
                    <div className="col-span-4">
                      <div className="font-semibold text-sm text-gray-700">Shipping Address</div>
                      <div className="text-xs text-gray-500">Customer Contact</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-semibold text-sm text-gray-700 text-right">Actions</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Order Cards */}
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
      {totalOrders > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Left side - Page size selector and info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">orders per page</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {totalOrders === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalOrders)} of {totalOrders} orders
                  {searchQuery && (
                    <span className="ml-2 text-blue-600">
                      (filtered by "{searchQuery}")
                    </span>
                  )}
                </div>
              </div>
              
              {/* Right side - Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:flex"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10 h-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="w-10 h-8"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:flex"
                  >
                    Last
                  </Button>
                </div>
              )}
            </div>
            
            {/* Quick jump to page */}
            {totalPages > 10 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Go to page:</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  placeholder="Page"
                  className="w-20 h-8"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const pageNum = parseInt((e.target as HTMLInputElement).value);
                      if (pageNum >= 1 && pageNum <= totalPages) {
                        handlePageChange(pageNum);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">of {totalPages}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintingPage;
