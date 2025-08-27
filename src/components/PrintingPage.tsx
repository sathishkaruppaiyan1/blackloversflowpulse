import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, ChevronLeft, ChevronRight, Printer, MapPin, Phone, Mail, Calendar, Weight, DollarSign } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PrintingFilters } from './PrintingFilters';
import PrintingOrderCard from './PrintingOrderCard';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import PackingSlipTemplate from './PackingSlipTemplate';
import { PrintingAnalytics } from './PrintingAnalytics';
import { PrintingSearchBar } from './PrintingSearchBar';

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

  const handlePrint = async (order: WooCommerceOrder) => {
    console.log('Printing order:', order.order_number);
    toast.success(`Printing order ${order.order_number}`);
    
    // Move to packing stage after printing
    try {
      await wooCommerceOrderService.updateOrderStage(order.id, 'packing');
      await loadProcessingOrders();
      toast.success(`Order ${order.order_number} moved to packing stage`);
    } catch (error: any) {
      console.error('Error moving order to packing:', error);
      toast.error('Failed to move order to packing stage');
    }
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

  const handleBulkPrint = async () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
    console.log('Bulk printing orders:', selectedOrders.map(o => o.order_number));
    toast.success(`Printing ${selectedOrders.length} selected orders`);
    
    // Move all selected orders to packing stage after printing
    try {
      for (const order of selectedOrders) {
        await wooCommerceOrderService.updateOrderStage(order.id, 'packing');
      }
      await loadProcessingOrders();
      toast.success(`Moved ${selectedOrders.length} orders to packing stage`);
    } catch (error: any) {
      console.error('Error moving orders to packing:', error);
      toast.error('Failed to move some orders to packing stage');
    }
    
    // Clear selection after printing
    setSelectedOrderIds(new Set());
    setSelectAll(false);
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

  // Calculate pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

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
    <div className="space-y-4 p-6">
      {/* Header matching the reference image */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders for Printing</h1>
          <p className="text-gray-600 mt-1">
            {totalOrders} orders in printing stage • Auto-synced from Shopify
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSelectAll(true)}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSelectAll(false)}
            className="text-gray-600"
          >
            Unselect All
          </Button>
          <Button
            onClick={syncFromWooCommerce}
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <PrintingAnalytics 
        totalOrders={orders.length} 
        selectedCount={selectedOrderIds.size} 
      />

      {/* Search Bar */}
      <PrintingSearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Filters */}
      <PrintingFilters 
        onFiltersChange={handleFiltersChange}
        totalOrders={totalOrders}
      />

      {/* Orders List - Simplified Layout matching reference */}
      <div className="bg-white rounded-lg border">
        {paginatedOrders.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              No orders match your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  {/* Left side - Checkbox and Order Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, Boolean(checked))}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-8">
                        {/* Order Number and Customer */}
                        <div className="min-w-0 flex-shrink-0" style={{ width: '140px' }}>
                          <div className="font-semibold text-gray-900">#{order.order_number}</div>
                          <div className="text-sm text-gray-600 truncate">{order.customer_name}</div>
                        </div>
                        
                        {/* Products */}
                        <div className="flex-1 min-w-0" style={{ width: '200px' }}>
                          <div className="text-sm font-medium text-gray-900 mb-1">Products:</div>
                          {order.line_items?.map((item: any, index: number) => (
                            <div key={index} className="text-sm">
                              <div className="text-gray-900">{item.name || 'Product Name'}</div>
                              <div className="text-blue-600">
                                {item.color || 'Multi color'} / {item.size || '2XL'}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-shrink-0" style={{ width: '120px' }}>
                          <div className="text-sm font-medium text-gray-900 mb-1">Details:</div>
                          <div className="text-sm text-gray-600">
                            {((Number(order.line_items?.[0]?.weight) || 0.5) * (Number(order.line_items?.[0]?.quantity) || 1)).toFixed(0)}g
                          </div>
                          <div className="text-sm text-gray-600">
                            ₹{order.total.toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                        
                        {/* Address */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">Address:</div>
                          <div className="text-sm text-gray-600">
                            {order.shipping_address?.split(',').slice(0, 3).join(', ') || 'No address'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.shipping_address?.split(',').slice(-2).join(', ') || ''}
                          </div>
                          {order.customer_phone && (
                            <div className="text-sm text-red-500 mt-1">
                              📞 {order.customer_phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side - Print Button with Dialog */}
                  <div className="flex-shrink-0 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                          variant="outline"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <PackingSlipTemplate
                          order={order}
                          showPrintButton={true}
                          onPrint={() => handlePrint(order)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintingPage;
