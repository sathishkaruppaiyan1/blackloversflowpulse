
import React, { useState, useEffect, useCallback } from 'react';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useBypassPackingStage } from '@/hooks/useBypassPackingStage';
import { supabase } from '@/integrations/supabase/client';
import { bulkOrderMovementService } from '@/services/bulkOrderMovementService';

const PrintingPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WooCommerceOrder[]>([]);
  const [allOrdersForAnalytics, setAllOrdersForAnalytics] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get bypass packing stage setting
  const { bypassPackingStage } = useBypassPackingStage();

  // Fast function to fetch from database without syncing
  const fetchProcessingOrdersFromDB = useCallback(async () => {
    if (!user) return;
    
    try {
      const processingOrders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setOrders(processingOrders);
      setFilteredOrders(processingOrders);
      
      // Also fetch all orders for analytics calculation
      const allOrders = await wooCommerceOrderService.fetchOrders();
      setAllOrdersForAnalytics(allOrders);
      
      // Debug: Log orders with printed_at for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayPrintedCount = allOrders.filter(order => {
        if (!order.printed_at) return false;
        const printedDate = new Date(order.printed_at);
        return printedDate >= today && printedDate < tomorrow;
      }).length;
      console.log(`📊 PrintingPage: Fetched ${allOrders.length} total orders, ${todayPrintedCount} printed today`);
      
      console.log(`✅ Loaded ${processingOrders.length} processing orders from database`);
    } catch (error: any) {
      console.error('Error fetching processing orders:', error);
      toast.error('Failed to fetch processing orders');
    }
  }, [user]);

  // Full sync function (slow - only for manual sync)
  const loadProcessingOrders = async (shouldSync: boolean = false) => {
    if (!user) {
      toast.error('Please log in to view orders');
      return;
    }

    setLoading(true);
    try {
      if (shouldSync) {
        console.log('📖 Syncing and fetching processing orders from WooCommerce...');
        await wooCommerceOrderService.syncOrdersFromWooCommerce();
      } else {
        console.log('📖 Fetching processing orders from database...');
      }
      const processingOrders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setOrders(processingOrders);
      setFilteredOrders(processingOrders);
      
      // Also fetch all orders for analytics calculation
      const allOrders = await wooCommerceOrderService.fetchOrders();
      setAllOrdersForAnalytics(allOrders);
      
      // Debug: Log orders with printed_at for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayPrintedCount = allOrders.filter(order => {
        if (!order.printed_at) return false;
        const printedDate = new Date(order.printed_at);
        return printedDate >= today && printedDate < tomorrow;
      }).length;
      console.log(`📊 PrintingPage: Fetched ${allOrders.length} total orders, ${todayPrintedCount} printed today`);
      
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
      await loadProcessingOrders(true); // Pass true to sync
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
    // Don't move order here - wait for actual print confirmation
  };

  const moveToPackingStage = async (orderId: string) => {
    try {
      const targetStage = bypassPackingStage ? 'packed' : 'packing';
      await wooCommerceOrderService.updateOrderStage(orderId, targetStage);
      await fetchProcessingOrdersFromDB(); // Fast fetch without syncing
      const stageMessage = bypassPackingStage 
        ? 'Order moved to tracking stage' 
        : 'Order moved to packing stage';
      toast.success(stageMessage);
    } catch (error: any) {
      console.error('Error moving order:', error);
      toast.error(`Failed to move order to ${bypassPackingStage ? 'tracking' : 'packing'} stage`);
    }
  };

  const handleBulkPrint = async () => {
    // Get selected orders and ensure we have valid order IDs
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
    
    // Also capture order IDs directly from the Set to ensure we have the source of truth
    const selectedOrderIdsArray = Array.from(selectedOrderIds);
    
    console.log('Bulk printing orders:', {
      selectedOrdersCount: selectedOrders.length,
      selectedOrderIdsCount: selectedOrderIdsArray.length,
      orderNumbers: selectedOrders.map(o => o.order_number),
      orderIds: selectedOrderIdsArray
    });
    
    if (selectedOrders.length === 0 || selectedOrderIdsArray.length === 0) {
      toast.error('No orders selected for printing');
      return;
    }
    
    // Validate that all selected order IDs have corresponding orders
    if (selectedOrders.length !== selectedOrderIdsArray.length) {
      console.warn('⚠️ Mismatch: Some selected order IDs do not have corresponding orders');
      const missingIds = selectedOrderIdsArray.filter(id => !selectedOrders.some(o => o.id === id));
      console.warn('Missing order IDs:', missingIds);
    }

    toast.success(`Preparing to print ${selectedOrders.length} packing slips...`);
    
    // Create bulk print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Could not open print window. Please allow pop-ups for this site.');
      return;
    }

    try {
      // Fetch company settings and format
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const format = settings?.default_label_format || 'A4';
      const companySettings = settings ? {
        company_name: settings.company_name || 'Perfect Collections',
        address_line1: settings.address_line1 || '',
        address_line2: settings.address_line2 || '',
        city: settings.city || '',
        state: settings.state || '',
        postal_code: settings.postal_code || '',
        country: settings.country || '',
        phone: settings.phone || '',
        email: settings.email || ''
      } : {
        company_name: 'Perfect Collections',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        phone: '',
        email: ''
      };

      // Import React DOM and print components
      const { createRoot } = await import('react-dom/client');
      const PrintPackingSlipA4 = (await import('./print/PrintPackingSlipA4')).default;
      const PrintPackingSlipA5 = (await import('./print/PrintPackingSlipA5')).default;
      const PrintComponent = format === 'A5' ? PrintPackingSlipA5 : PrintPackingSlipA4;

      // Import JsBarcode for barcode generation
      const JsBarcode = (await import('jsbarcode')).default;

      // Generate barcodes for all orders
      const ordersWithBarcodes = await Promise.all(selectedOrders.map(async (order) => {
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, order.order_number, {
            format: "CODE128",
            width: format === 'A5' ? 1.2 : 2,
            height: format === 'A5' ? 35 : 60,
            displayValue: true,
            fontSize: format === 'A5' ? 20 : 18,
            margin: format === 'A5' ? 5 : 10,
            background: "#ffffff",
            lineColor: "#000000"
          });
          return { ...order, barcodeDataUrl: canvas.toDataURL() };
        } catch (error) {
          console.error('Error generating barcode for order', order.order_number, error);
          return { ...order, barcodeDataUrl: '' };
        }
      }));

      // Create a container for all packing slips
      const printContainer = document.createElement('div');
      printContainer.id = 'bulk-print-container';
      
      const root = createRoot(printContainer);

      // Create bulk print content with all selected orders, each wrapped in a page-break div
      // CRITICAL: Each order must start on a NEW page, even if previous order spans multiple pages
      const bulkPrintContent = React.createElement('div', {
        style: { width: '100%' }
      }, ordersWithBarcodes.map((order, index) => 
        React.createElement('div', {
          key: order.id,
          className: 'packing-slip-order-wrapper',
          style: {
            // Force each order to start on a new page (except first)
            pageBreakBefore: index > 0 ? 'always' : 'auto',
            // CRITICAL: Force page break AFTER each order wrapper (except last)
            // This ensures next order ALWAYS starts on fresh page, even if this order's products span pages
            pageBreakAfter: index < ordersWithBarcodes.length - 1 ? 'always' : 'auto',
            // Allow order content to span multiple pages if needed (for orders with many products)
            pageBreakInside: 'auto',
            width: '100%',
            display: 'block'
          }
        }, React.createElement('div', {
          className: 'packing-slip-page',
          style: {
            pageBreakInside: 'auto', // Allow products to span pages within this order
            minHeight: format === 'A5' ? '8.27in' : '11in',
            width: format === 'A5' ? '5.83in' : '8.27in',
            margin: '0 auto',
            display: 'block',
            position: 'relative'
          }
        }, React.createElement(PrintComponent, {
          order: order,
          companySettings: companySettings,
          barcodeDataUrl: order.barcodeDataUrl
        })))
      ));

      // Render the bulk content
      root.render(bulkPrintContent);

      // Wait for rendering to complete
      setTimeout(() => {
        const printedContent = printContainer.innerHTML;

        // Set up print window with styles - ensure one order per page
        const pageSize = format === 'A5' ? 'A5' : 'A4';
        const pageMargin = format === 'A5' ? '0.3in' : '0.75in';
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Bulk Print - ${selectedOrders.length} Packing Slips</title>
            <meta charset="utf-8">
            <style>
              @page {
                size: ${pageSize};
                margin: ${pageMargin};
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                * { 
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  box-sizing: border-box;
                }
                /* Order wrapper - ensures each order starts on new page and next order starts on new page */
                .packing-slip-order-wrapper {
                  page-break-before: always !important;
                  page-break-after: always !important;
                  page-break-inside: auto !important;
                  width: 100% !important;
                  display: block !important;
                }
                .packing-slip-order-wrapper:first-child {
                  page-break-before: auto !important;
                }
                .packing-slip-order-wrapper:last-child {
                  page-break-after: auto !important;
                }
                
                /* Packing slip page - allows products to span multiple pages within an order */
                .packing-slip-page {
                  page-break-before: auto !important;
                  page-break-after: auto !important;
                  page-break-inside: auto !important;
                  width: ${format === 'A5' ? '5.83in' : '8.27in'};
                  min-height: ${format === 'A5' ? '8.27in' : '11in'};
                  margin: 0 auto;
                  display: block;
                  position: relative;
                }
                
                /* Override A5 component fixed height to allow multi-page content */
                .packing-slip-page > div {
                  height: auto !important;
                  min-height: ${format === 'A5' ? '8.27in' : '11in'} !important;
                  max-height: none !important;
                  overflow: visible !important;
                  page-break-inside: auto !important;
                  page-break-after: auto !important;
                }
                
                /* Ensure each order wrapper forces a new page for next order */
                .packing-slip-order-wrapper + .packing-slip-order-wrapper {
                  page-break-before: always !important;
                }
                img {
                  max-width: 100% !important;
                  height: auto !important;
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                table {
                  page-break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                }
                /* Ensure proper spacing between orders */
                .packing-slip-page {
                  break-before: page;
                }
                .packing-slip-page:first-child {
                  break-before: auto;
                }
              }
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.4; 
                margin: 0;
                padding: 0;
                background: white;
                color: black;
              }
            </style>
          </head>
          <body>
            ${printedContent}
          </body>
          </html>
        `);

        printWindow.document.close();

        // Track print dialog state
        let printDialogOpened = false;
        let printStartTime = 0;
        const PRINT_CONFIRMATION_DELAY = 500; // Minimum time to consider print as executed (ms)
        
        // Capture order IDs at the time of printing to avoid closure issues
        // IMPORTANT: Use selectedOrders.map() to maintain the exact same order as printed
        // This ensures we move the exact same orders that were printed, in the same order
        const orderIdsToMove = selectedOrders
          .map(order => order.id)
          .filter(id => {
            if (!id) {
              console.warn(`⚠️ Found order with null/undefined ID`);
              return false;
            }
            // Verify the ID is in the selectedOrderIds Set (double-check)
            if (!selectedOrderIds.has(id)) {
              console.warn(`⚠️ Order ID ${id} not in selectedOrderIds Set`);
              return false;
            }
            return true;
          });
        const ordersCount = selectedOrders.length; // Use the actual printed count
        
        // Log order IDs being moved for debugging
        console.log(`📋 Bulk print: Printing ${selectedOrders.length} orders, will move ${orderIdsToMove.length} orders:`, 
          orderIdsToMove.map((id, idx) => {
            const order = selectedOrders.find(o => o.id === id);
            return { 
              index: idx, 
              id: id, 
              order_number: order?.order_number || 'UNKNOWN',
              exists: !!order
            };
          })
        );
        
        // Validate we have the same count
        if (orderIdsToMove.length !== selectedOrders.length) {
          console.error(`❌ CRITICAL: Mismatch! Printing ${selectedOrders.length} orders but only ${orderIdsToMove.length} IDs to move`);
          const missingIds = selectedOrders
            .filter(o => !orderIdsToMove.includes(o.id))
            .map(o => ({ id: o.id, order_number: o.order_number }));
          console.error('Missing order IDs:', missingIds);
        }
        
        // Set up event listeners BEFORE calling print()
        printWindow.addEventListener('beforeprint', () => {
          printDialogOpened = true;
          printStartTime = Date.now();
          console.log('📄 Print dialog opened');
        });

        // Handle after print - move orders ONLY if print was actually executed
        printWindow.addEventListener('afterprint', async () => {
          const printDuration = Date.now() - printStartTime;
          console.log(`📄 Print dialog closed after ${printDuration}ms`);
          
          // Check if print dialog was opened (user interacted with it)
          if (printDialogOpened) {
            // Heuristic: If print dialog was open for less than 200ms, user likely canceled immediately
            // If open for longer, assume print was executed (user had time to click print)
            // This is a best-effort detection since browsers don't provide reliable cancel detection
            if (printDuration > PRINT_CONFIRMATION_DELAY) {
              console.log('✅ Print likely executed (dialog open >500ms) - moving orders to next stage');
              await moveOrdersToNextStage();
            } else {
              console.log('❌ Print likely canceled (dialog closed quickly) - NOT moving orders');
              toast.info('Print canceled. Orders were not moved to the next stage.');
            }
          } else {
            // Print dialog never opened (window closed before print)
            console.log('❌ Print dialog never opened - NOT moving orders');
          }
          
          printWindow.close();
        });
        
        // Function to move orders to next stage
        const moveOrdersToNextStage = async () => {
          try {
            const targetStage = bypassPackingStage ? 'packed' : 'packing';
            console.log(`🔄 Moving ${orderIdsToMove.length} orders to ${targetStage} stage...`);
            
            // Use bulk movement service for better performance and error handling
            const result = await bulkOrderMovementService.bulkUpdateOrderStage(
              orderIdsToMove,
              targetStage,
              { skipWooSync: true, notes: 'Bulk printed' }
            );
            
            console.log(`📊 Bulk movement result:`, {
              success: result.success,
              processedCount: result.processedCount,
              failedCount: result.failedCount,
              expectedCount: ordersCount,
              errors: result.errors
            });
            
            await fetchProcessingOrdersFromDB(); // Fast fetch without syncing
            
            // Check if all orders were moved successfully
            if (result.processedCount !== ordersCount) {
              const missingCount = ordersCount - result.processedCount;
              toast.warning(
                `Printed ${ordersCount} orders, but only ${result.processedCount} were moved. ${missingCount} order(s) may need manual movement.`
              );
              if (result.errors.length > 0) {
                console.error('❌ Errors during bulk movement:', result.errors);
              }
            } else if (result.success) {
              // Only show success message if bulk service didn't already show one
              const stageMessage = bypassPackingStage
                ? `Printed and moved ${ordersCount} orders to tracking stage`
                : `Printed and moved ${ordersCount} orders to packing stage`;
              toast.success(stageMessage);
            }
          } catch (error: any) {
            console.error('❌ Error moving orders:', error);
            const errorMessage = bypassPackingStage
              ? 'Printed successfully, but failed to move some orders to tracking stage'
              : 'Printed successfully, but failed to move some orders to packing stage';
            toast.error(errorMessage);
          }
          
          // Clear selection after printing
          setSelectedOrderIds(new Set());
          setSelectAll(false);
        };

        // Wait for content to load, then print
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          toast.success(`Printing ${selectedOrders.length} packing slips...`);
        }, 2000);

        // Fallback cleanup after 30 seconds if user doesn't print
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
        }, 30000);

      }, 500);

    } catch (error: any) {
      console.error('Error in bulk printing:', error);
      toast.error(`Failed to prepare bulk print: ${error.message}`);
      printWindow.close();
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

    // Helper function to apply filter type logic
    const applyFilterType = (itemValue: string, filterValue: string, filterType: string) => {
      const item = itemValue.toLowerCase();
      const filter = filterValue.toLowerCase();
      
      switch (filterType) {
        case 'equals':
          return item === filter;
        case 'starts':
          return item.startsWith(filter);
        case 'contains':
        default:
          return item.includes(filter);
      }
    };

    // Apply product filter
    if (filters.product && filters.product !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          applyFilterType(item.name || '', filters.product, filters.filterType || 'contains')
        )
      );
    }

    // Apply color filter
    if (filters.color && filters.color !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.color && applyFilterType(item.color, filters.color, filters.filterType || 'contains')
        )
      );
    }

    // Apply size filter
    if (filters.size && filters.size !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => 
          item.size && applyFilterType(item.size, filters.size, filters.filterType || 'contains')
        )
      );
    }

    // Apply variation filter - check against variation_id or create combined variation from available properties
    if (filters.variation && filters.variation !== 'any') {
      filtered = filtered.filter(order => 
        order.line_items?.some(item => {
          // Check against weight
          if (item.weight && applyFilterType(item.weight, filters.variation, filters.filterType || 'contains')) {
            return true;
          }
          // Check against material
          if (item.material && applyFilterType(item.material, filters.variation, filters.filterType || 'contains')) {
            return true;
          }
          // Check against brand
          if (item.brand && applyFilterType(item.brand, filters.variation, filters.filterType || 'contains')) {
            return true;
          }
          // Check meta_data for variation information
          if (item.meta_data && Array.isArray(item.meta_data)) {
            return item.meta_data.some(meta => 
              meta.display_value && applyFilterType(meta.display_value.toString(), filters.variation, filters.filterType || 'contains')
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

  // Load orders on component mount - fetch from DB first (fast), then sync in background
  useEffect(() => {
    if (user) {
      // First, fetch from database immediately (fast)
      fetchProcessingOrdersFromDB();
      
      // Then sync in background (slow, but doesn't block UI)
      setTimeout(async () => {
        try {
          await wooCommerceOrderService.syncOrdersFromWooCommerce();
          // After sync, refresh from database
          await fetchProcessingOrdersFromDB();
        } catch (error) {
          console.error('Background sync error:', error);
          // Don't show error toast for background sync
        }
      }, 100);
    }
  }, [user, fetchProcessingOrdersFromDB]);

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

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
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
        allOrders={allOrdersForAnalytics}
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
        orders={orders}
      />

      {/* Selection Controls - Below Filters */}
      <div className="flex items-center justify-between mb-4">
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
          {selectedOrderIds.size > 0 && (
            <Button
              onClick={handleBulkPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Bulk Print ({selectedOrderIds.size})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {selectedOrderIds.size > 0 && (
            <div className="text-sm text-gray-600">
              {selectedOrderIds.size} of {totalOrders} orders selected
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>
      </div>

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
                          onPrint={async () => {
                            // Move order to appropriate stage after actual printing
                            try {
                              const targetStage = bypassPackingStage ? 'packed' : 'packing';
                              await wooCommerceOrderService.updateOrderStage(order.id, targetStage);
                              await fetchProcessingOrdersFromDB(); // Fast fetch without syncing
                              const stageMessage = bypassPackingStage 
                                ? `Order ${order.order_number} moved to tracking stage` 
                                : `Order ${order.order_number} moved to packing stage`;
                              toast.success(stageMessage);
                            } catch (error: any) {
                              console.error('Error moving order:', error);
                              toast.error(`Failed to move order to ${bypassPackingStage ? 'tracking' : 'packing'} stage`);
                            }
                          }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, totalOrders)} of {totalOrders} orders
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {generatePageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === '...' ? (
                    <span className="px-3 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => handlePageChange(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PrintingPage;
