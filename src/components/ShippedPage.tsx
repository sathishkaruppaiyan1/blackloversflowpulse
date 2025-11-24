import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RefreshCw, Search, Package, CheckCircle, Calendar as CalendarIcon, MapPin, Truck, MessageSquare, RotateCcw, Download, X, ChevronDown } from 'lucide-react';
import { useWooCommerceOrders } from '@/hooks/useWooCommerceOrders';
import { useCompletedOrders } from '@/hooks/useCompletedOrders';
import { WooCommerceOrder, wooCommerceOrderService } from '@/services/wooCommerceOrderService';
import { interaktService } from '@/services/interaktService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportOrdersToCSV } from '@/utils/csvExport';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

// Extended type for shipped orders with source information
interface ShippedOrderWithSource extends WooCommerceOrder {
  source: 'active' | 'completed';
}

const ShippedPage = () => {
  const { orders: allOrders, loading, fetchOrdersFromWooCommerce, refetch } = useWooCommerceOrders();
  const { completedOrders, loading: completedLoading, refetch: refetchCompleted } = useCompletedOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const customRangeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredOrders, setFilteredOrders] = useState<ShippedOrderWithSource[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();

  // Get all shipped orders - combine active and completed orders without removing any
  const getShippedOrders = (): ShippedOrderWithSource[] => {
    console.log('📦 Getting shipped orders...');
    console.log('Active orders:', allOrders.length);
    console.log('Completed orders:', completedOrders.length);

    // Get active shipped/delivered/completed orders (including WooCommerce completed status)
    const activeShippedOrders = allOrders.filter(order => 
      order.status === 'shipped' || 
      order.status === 'delivered' || 
      order.status === 'completed' // Include WooCommerce completed orders
    );
    console.log('Active shipped/delivered/completed orders:', activeShippedOrders.length);

    // Convert completed orders to the same format
    const completedShippedOrders = completedOrders
      .filter(completedOrder => {
        const orderData = completedOrder.order_data as any;
        return orderData && (
          orderData.status === 'shipped' || 
          orderData.status === 'delivered' || 
          orderData.status === 'completed'
        );
      })
      .map(completedOrder => {
        const orderData = completedOrder.order_data as any;
        return {
          id: completedOrder.original_order_id,
          order_number: orderData.order_number || '',
          customer_name: orderData.customer_name || '',
          customer_email: orderData.customer_email || '',
          customer_phone: orderData.customer_phone || '',
          total: parseFloat(orderData.total?.toString() || '0'),
          status: orderData.status || 'shipped',
          stage: (orderData.status === 'completed' ? 'shipped' : orderData.status) as 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'completed',
          items: orderData.items || 0,
          shipping_address: orderData.shipping_address || '',
          created_at: orderData.created_at || '',
          printed_at: orderData.printed_at || '',
          packed_at: orderData.packed_at || '',
          shipped_at: orderData.shipped_at || '',
          delivered_at: orderData.delivered_at || '',
          tracking_number: orderData.tracking_number || '',
          carrier: orderData.carrier || '',
          reseller_name: orderData.reseller_name || '',
          reseller_number: orderData.reseller_number || '',
          line_items: orderData.line_items || []
        } as WooCommerceOrder;
      });
    
    console.log('Completed shipped orders:', completedShippedOrders.length);

    // Create a Map to track unique orders by order_number to avoid duplicates
    const uniqueOrdersMap = new Map<string, ShippedOrderWithSource>();

    // Add active orders first (they take precedence)
    activeShippedOrders.forEach(order => {
      uniqueOrdersMap.set(order.order_number, { 
        ...order, 
        source: 'active' as const,
        // Normalize status display - show shipped for completed WooCommerce orders
        status: order.status === 'completed' ? 'shipped' : order.status,
        stage: (order.status === 'completed' ? 'shipped' : order.stage) as 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'completed'
      });
    });

    // Add completed orders only if they don't already exist in active orders
    completedShippedOrders.forEach(order => {
      if (!uniqueOrdersMap.has(order.order_number)) {
        uniqueOrdersMap.set(order.order_number, { ...order, source: 'completed' as const });
      }
    });

    const allShippedOrders = Array.from(uniqueOrdersMap.values());

    console.log('Total unique shipped orders:', allShippedOrders.length);

    // Sort by shipped date (most recent first), then by created date
    const sortedOrders = allShippedOrders.sort((a, b) => {
      const aDate = new Date(a.shipped_at || a.created_at).getTime();
      const bDate = new Date(b.shipped_at || b.created_at).getTime();
      return bDate - aDate;
    });

    console.log('✅ Final shipped orders count:', sortedOrders.length);
    return sortedOrders;
  };

  // Helper function to check if date range is today
  const isToday = (from: Date, to: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    const todayStartTime = today.getTime();
    const todayEndTime = todayEnd.getTime();
    
    return fromTime === todayStartTime && toTime === todayEndTime;
  };

  // Helper function to check if date range is this week
  const isThisWeek = (from: Date, to: Date): boolean => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    const weekStartTime = weekStart.getTime();
    const weekEndTime = weekEnd.getTime();
    
    return fromTime === weekStartTime && toTime === weekEndTime;
  };

  // Helper function to check if date range is this month
  const isThisMonth = (from: Date, to: Date): boolean => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    const monthStartTime = monthStart.getTime();
    const monthEndTime = monthEnd.getTime();
    
    return fromTime === monthStartTime && toTime === monthEndTime;
  };

  const shippedOrders = getShippedOrders();

  // Sync selectedFilter with dateRange changes
  useEffect(() => {
    if (!dateRange?.from) {
      setSelectedFilter('all');
    } else if (dateRange?.from && dateRange?.to) {
      if (isToday(dateRange.from, dateRange.to)) {
        setSelectedFilter('today');
      } else if (isThisWeek(dateRange.from, dateRange.to)) {
        setSelectedFilter('thisWeek');
      } else if (isThisMonth(dateRange.from, dateRange.to)) {
        setSelectedFilter('thisMonth');
      } else {
        setSelectedFilter('custom');
      }
    } else if (dateRange?.from) {
      setSelectedFilter('custom');
    }
  }, [dateRange]);

  // Filter orders based on search term and date range
  useEffect(() => {
    let filtered = [...shippedOrders];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.carrier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter (filter by shipped_at date)
    if (dateRange?.from) {
      filtered = filtered.filter(order => {
        const shippedDate = order.shipped_at ? new Date(order.shipped_at) : null;
        if (!shippedDate) return false;
        
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return shippedDate >= fromDate && shippedDate <= toDate;
        } else {
          // If only from date is selected, filter for that single day
          const fromDateEnd = new Date(dateRange.from);
          fromDateEnd.setHours(23, 59, 59, 999);
          return shippedDate >= fromDate && shippedDate <= fromDateEnd;
        }
      });
    }

    setFilteredOrders(filtered);
  }, [searchTerm, dateRange, shippedOrders]);

  const getCarrierDisplayName = (carrier?: string) => {
    if (!carrier) return 'Unknown';
    switch (carrier.toLowerCase()) {
      case 'frenchexpress':
        return 'Franch Express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return carrier;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateTrackingLink = (trackingNumber?: string, carrier?: string) => {
    if (!trackingNumber || !carrier) return '#';
    
    const lowerCarrier = carrier.toLowerCase();
    switch (lowerCarrier) {
      case 'frenchexpress':
        return `https://franchexpress.com/courier-tracking/?awb=${trackingNumber}`;
      case 'delhivery':
        return `https://www.delhivery.com/track-v2/package/${trackingNumber}`;
      default:
        return `https://www.google.com/search?q=${encodeURIComponent(carrier + ' ' + trackingNumber + ' tracking')}`;
    }
  };

  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing all order data...');
      await Promise.all([
        fetchOrdersFromWooCommerce(),
        refetchCompleted()
      ]);
      toast.success('Orders refreshed successfully');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    }
  };

  const handleUpdateStatus = async (order: ShippedOrderWithSource) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setUpdatingStatus(order.id);
    
    try {
      // Update WooCommerce with current tracking information
      if (order.tracking_number && order.carrier) {
        await wooCommerceOrderService.updateTracking(order.id, order.tracking_number, order.carrier);
        toast.success(`Order ${order.order_number} tracking information updated in WooCommerce`);
      } else {
        toast.success(`Order ${order.order_number} data synchronized with WooCommerce`);
      }
      
      // Refresh orders from database to show any updates
      await refetch();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order in WooCommerce');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSendWhatsApp = async (order: ShippedOrderWithSource) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    // Initialize Interakt service
    await interaktService.initialize(user.id);

    if (!interaktService.isActive()) {
      toast.error('WhatsApp service not configured. Please setup Interakt integration.');
      return;
    }

    // Check if we have reseller details for WhatsApp
    if (!order.reseller_name || !order.reseller_number) {
      toast.error('No reseller contact details available for WhatsApp notification');
      return;
    }

    setSendingMessage(order.id);

    try {
      // Extract product information from line_items
      let productName = 'Product';
      let productVariant = 'Standard';
      
      if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
        const firstItem = order.line_items[0];
        productName = firstItem.name || order.product_name || 'Product';
        
        // Extract variant information
        if (firstItem.meta_data && Array.isArray(firstItem.meta_data)) {
          const variantMeta = firstItem.meta_data.find((meta: any) => 
            meta.key === 'variation' || meta.key === 'Variation' || meta.key === 'pa_variation'
          );
          if (variantMeta && variantMeta.value) {
            productVariant = variantMeta.value;
          }
        } else if (firstItem.variation_id && firstItem.variation_id > 0) {
          productVariant = `Variation ${firstItem.variation_id}`;
        } else if (order.product_variation) {
          productVariant = order.product_variation;
        }
      } else {
        // Fallback to order-level product info
        productName = order.product_name || 'Product';
        productVariant = order.product_variation || 'Standard';
      }

      const trackingData = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        trackingNumber: order.tracking_number || 'N/A',
        carrier: order.carrier || 'Unknown',
        orderValue: String(order.total || '0'),
        shippingAddress: order.shipping_address || 'No address provided',
        resellerName: order.reseller_name,
        customerPhone: order.customer_phone || undefined,
        productName: productName,
        productVariant: productVariant
      };

      console.log('Sending WhatsApp with tracking data:', trackingData);

      const success = await interaktService.sendTrackingUpdateToReseller(
        trackingData,
        order.reseller_number,
        order.reseller_name
      );

      if (success) {
        toast.success(`WhatsApp message sent to ${order.reseller_name} successfully!`);
      } else {
        toast.error('Failed to send WhatsApp message');
      }

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Failed to send WhatsApp message');
    } finally {
      setSendingMessage(null);
    }
  };

  const handleExportCSV = async () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      let filename = `shipped-orders-${timestamp}.csv`;
      
      // Add date range to filename if filter is applied
      if (dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        filename = `shipped-orders-${fromStr}-to-${toStr}.csv`;
      }
      
      exportOrdersToCSV(filteredOrders, filename);
      toast.success(`Exported ${filteredOrders.length} orders to ${filename}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export orders to CSV');
    } finally {
      setExporting(false);
    }
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setSelectedFilter('all');
    setDropdownOpen(false);
  };

  const setTodayFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    setDateRange({ from: today, to: todayEnd });
    setSelectedFilter('today');
    setDropdownOpen(false);
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    setDateRange({ from: weekStart, to: weekEnd });
    setSelectedFilter('thisWeek');
    setDropdownOpen(false);
  };

  const setThisMonthFilter = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    setDateRange({ from: monthStart, to: monthEnd });
    setSelectedFilter('thisMonth');
    setDropdownOpen(false);
  };

  const handleCustomRangeClick = () => {
    setDropdownOpen(false);
    // Longer delay to ensure dropdown fully closes before opening popover
    setTimeout(() => {
      setCustomRangeOpen(true);
      // Focus the hidden button to ensure popover positioning works
      if (customRangeButtonRef.current) {
        customRangeButtonRef.current.focus();
      }
    }, 300);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setSelectedFilter('custom');
    } else if (range?.from) {
      setSelectedFilter('custom');
    } else {
      setSelectedFilter('all');
    }
  };

  const getFilterLabel = () => {
    if (!dateRange?.from) return 'All Dates';
    if (selectedFilter === 'today') return 'Today';
    if (selectedFilter === 'thisWeek') return 'This Week';
    if (selectedFilter === 'thisMonth') return 'This Month';
    if (selectedFilter === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "dd-MM-yyyy")} - ${format(dateRange.to, "dd-MM-yyyy")}`;
    }
    if (selectedFilter === 'custom' && dateRange?.from) {
      return format(dateRange.from, "dd-MM-yyyy");
    }
    return 'All Dates';
  };

  const getStatusBadge = (status: string, source: 'active' | 'completed') => {
    const isCompleted = source === 'completed';
    
    if (status === 'delivered') {
      return (
        <Badge className={`${isCompleted ? 'bg-green-200' : 'bg-green-100'} text-green-800 hover:bg-green-100`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Delivered {isCompleted && '(Archived)'}
        </Badge>
      );
    }
    // Show as shipped for both 'shipped' and 'completed' WooCommerce statuses
    return (
      <Badge className={`${isCompleted ? 'bg-blue-200' : 'bg-blue-100'} text-blue-800 hover:bg-blue-100`}>
        <Truck className="h-3 w-3 mr-1" />
        Shipped {isCompleted && '(Archived)'}
        {status === 'completed' && source === 'active' && (
          <span className="ml-1 text-xs">(WC: Completed)</span>
        )}
      </Badge>
    );
  };

  // Calculate unique orders for stats (using the same deduplication logic)
  const uniqueOrders = shippedOrders;

  return (
    <div className="w-full min-h-screen space-y-4 p-2 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="min-w-0 flex-shrink">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">Shipped Orders</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View all shipped and delivered orders with tracking information
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 relative min-w-0">
          {/* Combined Date Filter Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
            setDropdownOpen(open);
            // Close custom range popover when dropdown opens
            if (open) {
              setCustomRangeOpen(false);
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] sm:w-[180px] md:w-[200px] justify-between text-left font-normal text-xs sm:text-sm",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <div className="flex items-center min-w-0">
                  <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{getFilterLabel()}</span>
                </div>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50 flex-shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={clearDateRange}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                All Dates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={setTodayFilter}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={setThisWeekFilter}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={setThisMonthFilter}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                This Month
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCustomRangeClick();
                }}
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Custom Range
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom Range Popover - Separate from dropdown */}
          <Popover open={customRangeOpen} onOpenChange={(open) => {
            // Only allow closing if user explicitly closes or both dates are selected
            if (!open && dateRange?.from && dateRange?.to) {
              setCustomRangeOpen(false);
            } else {
              setCustomRangeOpen(open);
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                ref={customRangeButtonRef}
                variant="outline"
                className={cn(
                  "w-[160px] sm:w-[180px] md:w-[200px] justify-between text-left font-normal absolute left-0 top-0 opacity-0 pointer-events-none",
                  !dateRange && "text-muted-foreground"
                )}
                aria-hidden="true"
                tabIndex={-1}
              >
                <div className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Custom Range</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 z-[100]" 
              align="start" 
              side="bottom" 
              sideOffset={5}
              onInteractOutside={(e) => {
                // Prevent closing when clicking outside if only one date is selected
                if (dateRange?.from && !dateRange?.to) {
                  e.preventDefault();
                }
              }}
            >
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || new Date()}
                selected={dateRange}
                onSelect={(range) => {
                  handleCustomRangeSelect(range);
                  // Close popover when both dates are selected
                  if (range?.from && range?.to) {
                    setTimeout(() => {
                      setCustomRangeOpen(false);
                    }, 100);
                  }
                }}
                numberOfMonths={2}
              />
              <div className="p-3 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearDateRange();
                    setCustomRangeOpen(false);
                  }}
                  className="w-full"
                  disabled={!dateRange?.from}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={handleExportCSV} 
            disabled={exporting || filteredOrders.length === 0}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
          >
            {exporting ? (
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
            ) : (
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={loading || completedLoading}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${(loading || completedLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipped</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{shippedOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              All shipped orders (active + archived)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{uniqueOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From shipped orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Shipped</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {uniqueOrders.reduce((sum, order) => sum + (order.items || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total items shipped
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="w-full">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <span>All Shipped Orders ({filteredOrders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 sm:pl-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-md border overflow-x-auto w-full">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Order</TableHead>
                  <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Items</TableHead>
                  <TableHead className="text-xs sm:text-sm">Total</TableHead>
                  <TableHead className="text-xs sm:text-sm">Carrier</TableHead>
                  <TableHead className="text-xs sm:text-sm">Tracking</TableHead>
                  <TableHead className="text-xs sm:text-sm">Shipped Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loading || completedLoading) ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading orders...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 mb-2" />
                        {searchTerm ? 'No orders match your search criteria' : 'No shipped orders found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order, index) => (
                    <TableRow key={`${order.id}-${order.source}-${index}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">#{order.order_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(order.created_at)}
                          </span>
                          {order.source === 'completed' && (
                            <span className="text-xs text-orange-600 font-medium">Archived</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customer_name}</span>
                          {order.shipping_address && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {order.shipping_address.length > 30 
                                ? `${order.shipping_address.substring(0, 30)}...` 
                                : order.shipping_address}
                            </span>
                          )}
                          {order.reseller_name && (
                            <span className="text-xs text-blue-600">
                              Reseller: {order.reseller_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.items} items</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">₹{order.total?.toFixed(2) || '0.00'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{getCarrierDisplayName(order.carrier)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.tracking_number ? (
                          <div className="flex flex-col">
                            <a
                              href={generateTrackingLink(order.tracking_number, order.carrier)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {order.tracking_number}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No tracking</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          {formatDate(order.shipped_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status, order.source)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(order)}
                            disabled={updatingStatus === order.id}
                            className="h-8 px-2"
                            title="Sync order data with WooCommerce"
                          >
                            {updatingStatus === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span className="ml-1 text-xs">Update</span>
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendWhatsApp(order)}
                            disabled={sendingMessage === order.id || !order.reseller_name || !order.reseller_number}
                            className="h-8 px-2"
                            title={!order.reseller_name || !order.reseller_number ? 'No reseller contact details' : 'Send WhatsApp notification to reseller'}
                          >
                            {sendingMessage === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <MessageSquare className="h-3 w-3" />
                            )}
                            <span className="ml-1 text-xs">
                              {!order.reseller_name || !order.reseller_number ? 'No Contact' : 'WhatsApp'}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippedPage;
