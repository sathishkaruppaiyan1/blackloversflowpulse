import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, RefreshCw, Package, Phone } from "lucide-react";
import { toast } from "sonner";
import { PrintingFilters } from "./PrintingFilters";
import { ShippingLabelPreview } from "./ShippingLabelPreview";
import { wooCommerceOrderService, WooCommerceOrder } from "@/services/wooCommerceOrderService";
import { BulkMovementTrigger } from "./BulkMovementTrigger";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface FilterState {
  search: string;
  date: string;
  status: string;
  filterType: string;
  product: string;
  color: string;
  size: string;
}

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface OrderItem {
  name?: string;
  variant?: string;
  size?: string;
  quantity?: number;
}

interface OrderData {
  id?: string;
  customer?: string;
  reseller?: string;
  reseller_number?: string;
  amount?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  status?: string;
  items?: OrderItem[];
  orderId?: string;
}

export const PrintingPage = () => {
  const [processingOrders, setProcessingOrders] = useState<WooCommerceOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    date: '',
    status: '',
    filterType: 'all',
    product: 'all',
    color: 'all',
    size: 'all'
  });
  const [sort, setSort] = useState<SortState>({ field: "date", direction: "desc" });
  const [previewOrder, setPreviewOrder] = useState<OrderData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load processing orders
  const loadProcessingOrders = async () => {
    setLoading(true);
    try {
      console.log('📖 Loading processing orders...');
      const orders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setProcessingOrders(orders);
      console.log(`✅ Loaded ${orders.length} processing orders`);
    } catch (error: any) {
      console.error('Error loading processing orders:', error);
      toast.error('Failed to load processing orders');
    } finally {
      setLoading(false);
    }
  };

  // Sync from WooCommerce and refresh processing orders
  const syncAndRefresh = async () => {
    setLoading(true);
    try {
      console.log('🔄 Syncing from WooCommerce...');
      await wooCommerceOrderService.syncOrdersFromWooCommerce();
      await loadProcessingOrders();
      toast.success('Orders synced successfully');
    } catch (error: any) {
      console.error('Error syncing orders:', error);
      toast.error(`Failed to sync orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const extractProductData = () => {
    const products = new Set<string>();
    const colors = new Set<string>();
    const sizes = new Set<string>();

    processingOrders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (item.name) {
            products.add(item.name);
          }
          
          if (item.color) {
            colors.add(item.color);
          }
          if (item.size) {
            sizes.add(item.size);
          }

          if (item.meta_data && Array.isArray(item.meta_data)) {
            item.meta_data.forEach(meta => {
              if (meta.key.toLowerCase().includes('color')) {
                colors.add(meta.value);
              }
              if (meta.key.toLowerCase().includes('size')) {
                sizes.add(meta.value);
              }
            });
          }
        });
      }
    });

    return {
      products: Array.from(products).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort()
    };
  };

  const { products, colors, sizes } = extractProductData();

  const filteredOrders = processingOrders.filter(order => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        order.order_number?.toLowerCase().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm) ||
        order.shipping_address?.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }

    if (filters.date) {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (orderDate !== filters.date) return false;
    }

    if (filters.product && filters.product !== 'all') {
      const hasProduct = order.line_items?.some(item => item.name === filters.product);
      if (!hasProduct) return false;
    }

    if (filters.color && filters.color !== 'all') {
      const hasColor = order.line_items?.some(item => 
        item.color === filters.color ||
        item.meta_data?.some(meta => 
          meta.key.toLowerCase().includes('color') && meta.value === filters.color
        )
      );
      if (!hasColor) return false;
    }

    if (filters.size && filters.size !== 'all') {
      const hasSize = order.line_items?.some(item => 
        item.size === filters.size ||
        item.meta_data?.some(meta => 
          meta.key.toLowerCase().includes('size') && meta.value === filters.size
        )
      );
      if (!hasSize) return false;
    }

    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sort.field === 'date') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sort.direction === 'desc' ? dateB - dateA : dateA - dateB;
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map(order => order.id));
    }
  };

  const handleUnselectAll = () => {
    setSelectedOrders([]);
  };

  const handleBulkPrint = async () => {
    console.log("📦 Processing bulk print for orders:", selectedOrders);
    
    try {
      setLoading(true);
      const updatePromises = selectedOrders.map(orderId => 
        wooCommerceOrderService.updateOrderStage(orderId, 'packing')
      );
      
      await Promise.all(updatePromises);
      
      toast.success(`${selectedOrders.length} orders printed and moved to packing stage`);
      setSelectedOrders([]);
      
      // Refresh processing orders (printed orders should no longer appear)
      await loadProcessingOrders();
      
    } catch (error) {
      console.error('Error in bulk print:', error);
      toast.error('Failed to process bulk print');
    } finally {
      setLoading(false);
    }
  };

  const handleSinglePrint = (order: WooCommerceOrder) => {
    const displayOrder = formatOrderForDisplay(order);
    setPreviewOrder(displayOrder);
    setIsPreviewOpen(true);
  };

  const handlePrintAndMoveToNextStage = (order: WooCommerceOrder) => {
    const displayOrder = formatOrderForDisplay(order);
    setPreviewOrder(displayOrder);
    setIsPreviewOpen(true);
  };

  const handlePrintComplete = async (orderId?: string) => {
    console.log("✅ Print completed for order:", orderId);
    
    if (orderId) {
      try {
        setLoading(true);
        // Move order to packing stage
        await wooCommerceOrderService.updateOrderStage(orderId, 'packing');
        
        toast.success('Order printed and moved to packing stage');
        
        // Refresh processing orders (this order should no longer appear)
        await loadProcessingOrders();
        
      } catch (error) {
        console.error('Error moving order to packing:', error);
        toast.error('Failed to move order to packing stage');
      } finally {
        setLoading(false);
      }
    }
    
    // Close the preview modal
    setIsPreviewOpen(false);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log("Filters updated:", newFilters);
  };

  const handleSortChange = (newSort: SortState) => {
    setSort(newSort);
    console.log("Sort updated:", newSort);
  };

  const formatOrderForDisplay = (order: WooCommerceOrder): OrderData => ({
    id: `${order.order_number}`,
    customer: order.customer_name,
    reseller: order.reseller_name || "Direct Order",
    reseller_number: order.reseller_number || undefined,
    amount: `₹${order.total.toFixed(2)}`,
    address: order.shipping_address || "Address not available",
    city: "Chennai, Tamil Nadu 600079",
    country: "India",
    phone: order.customer_phone || "Phone not available",
    status: order.status,
    orderId: order.id, // Pass the database ID for status updates
    items: order.line_items?.map(item => ({
      name: item.name,
      quantity: item.quantity,
      variant: item.color && item.size ? `${item.color} / ${item.size}` : (item.color || item.size || 'Standard'),
      size: item.size || "Various"
    })) || []
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProductVariations = (item: any) => {
    let variations: string[] = [];
    
    if (item.color) variations.push(item.color);
    if (item.size) variations.push(item.size);
    
    if (item.meta_data && Array.isArray(item.meta_data)) {
      item.meta_data.forEach((meta: any) => {
        const key = meta.key.toLowerCase();
        if (key.includes('color') || key.includes('colour')) {
          if (!variations.includes(meta.value)) {
            variations.push(meta.value);
          }
        }
        if (key.includes('size')) {
          if (!variations.includes(meta.value)) {
            variations.push(meta.value);
          }
        }
      });
    }
    
    return variations.filter(v => v && v.trim()).join(' / ') || 'No variations';
  };

  // Load processing orders on component mount
  useEffect(() => {
    loadProcessingOrders();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-poppins">Printing Stage</h1>
          <p className="text-muted-foreground">Generate shipping labels for processing orders • Sync from WooCommerce</p>
        </div>
         <div className="flex items-center gap-2">
           <Button 
             variant="outline"
             onClick={syncAndRefresh}
             disabled={loading}
           >
             <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Sync & Refresh
           </Button>
           <Button 
             className="bg-green-600 hover:bg-green-700 text-white"
             disabled={selectedOrders.length === 0 || loading}
             onClick={handleBulkPrint}
           >
             <Printer className="w-4 h-4 mr-2" />
             Print Selected Labels ({selectedOrders.length})
           </Button>
           
           {/* NEW: Bulk Movement Trigger - only shows when orders are selected */}
           <BulkMovementTrigger
             selectedOrderIds={selectedOrders}
             selectedOrders={sortedOrders.filter(order => selectedOrders.includes(order.id))}
             currentStage="processing"
             onSuccess={loadProcessingOrders}
             variant="small"
           />
         </div>
      </div>

      <PrintingFilters 
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        products={products}
        colors={colors}
        sizes={sizes}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-poppins">Processing Orders for Printing</CardTitle>
              <CardDescription>
                {sortedOrders.length} processing orders available for printing
                {sortedOrders.length > itemsPerPage && (
                  <span> • Showing {startIndex + 1}-{Math.min(endIndex, sortedOrders.length)} of {sortedOrders.length}</span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline"
                onClick={handleSelectAll}
                disabled={paginatedOrders.length === 0}
              >
                {selectedOrders.length === paginatedOrders.length ? 'Unselect All' : 'Select All'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleUnselectAll}
                disabled={selectedOrders.length === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading processing orders...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Processing Orders Found</h3>
              <p className="text-muted-foreground mb-4">
                No processing orders found. Sync with WooCommerce to get latest orders.
              </p>
              <Button onClick={syncAndRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Sync Orders
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedOrders.map((order) => {
                  return (
                    <div key={order.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => handleOrderSelect(order.id)}
                      />
                      
                      <div className="flex-1 grid grid-cols-5 gap-6 items-start">
                        <div className="space-y-1">
                          <div className="font-bold text-lg">#{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_name}</div>
                          <div className="mt-3">
                            <Badge variant="default" className="text-xs">
                              Processing
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Products:</div>
                          {order.line_items && order.line_items.length > 0 ? (
                            order.line_items.map((item, index) => (
                              <div key={index} className="space-y-1 border-b pb-2 last:border-b-0">
                                <div className="font-medium text-sm">{item.name}</div>
                                <div className="text-xs text-blue-600 font-medium">
                                  {getProductVariations(item)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} | SKU: {item.sku || 'N/A'}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">No product details</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Order Details:</div>
                          <div className="space-y-1">
                            <div className="text-sm">Items: {order.items}</div>
                            <div className="text-sm font-bold">{formatCurrency(order.total)}</div>
                            <div className="text-sm">{formatDate(order.created_at)}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Reseller Details:</div>
                          {order.reseller_name ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-orange-800">{order.reseller_name}</div>
                              {order.reseller_number && (
                                <div className="text-sm text-orange-600">{order.reseller_number}</div>
                              )}
                              <div className="text-xs text-muted-foreground">Reseller Order</div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Direct Order</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Shipping Address:</div>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {order.shipping_address || "Address not available"}
                          </div>
                          
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 mt-2">
                              <Phone className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-red-500">{order.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                       <Button 
                         size="sm" 
                         onClick={() => handlePrintAndMoveToNextStage(order)}
                         className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                         disabled={loading}
                       >
                         <Printer className="w-4 h-4" />
                         Print & Move
                       </Button>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current page
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ShippingLabelPreview 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        orderData={previewOrder}
        onPrintComplete={handlePrintComplete}
      />
    </div>
  );
};
