
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Printer, MapPin, Phone, Mail, Calendar, Weight, DollarSign, ImageIcon, X } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder, WooCommerceOrderItem } from '@/services/wooCommerceOrderService';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBypassPackingStage } from '@/hooks/useBypassPackingStage';
import { supabase } from '@/integrations/supabase/client';
import { bulkOrderMovementService } from '@/services/bulkOrderMovementService';
import { syncCoordinator } from '@/services/syncCoordinator';
import { getCachedOrdersByStage, setCachedOrders } from '@/services/orderCacheService';
import { resolveLineItemImage } from '@/utils/printingImageResolver';

// Load cached orders for instant display in Printing page.
// IMPORTANT: read this fresh on each mount (not module-level) so that after the
// first DB fetch populates localStorage, subsequent visits to this page skip
// the loading spinner and render instantly from cache.
const loadCachedOrders = (): { processingOrders: WooCommerceOrder[]; allOrders: WooCommerceOrder[] } => {
  if (typeof window === 'undefined') return { processingOrders: [], allOrders: [] };
  const cachedOrders = getCachedOrdersByStage('processing');
  const allCached = getCachedOrdersByStage(['processing', 'packing', 'packed', 'printed']);

  if (cachedOrders.length > 0) {
    console.log(`📦 PrintingPage: Loading ${cachedOrders.length} cached processing orders for instant display`);
  }

  return { processingOrders: cachedOrders, allOrders: allCached };
};

const PrintingPage = () => {
  // Read cache lazily on each mount so revisiting the page skips the loading
  // spinner once the cache has been populated.
  const [orders, setOrders] = useState<WooCommerceOrder[]>(() => loadCachedOrders().processingOrders);
  const [filteredOrders, setFilteredOrders] = useState<WooCommerceOrder[]>(() => loadCachedOrders().processingOrders);
  const [allOrdersForAnalytics, setAllOrdersForAnalytics] = useState<WooCommerceOrder[]>(() => loadCachedOrders().allOrders);
  const [loading, setLoading] = useState(() => loadCachedOrders().processingOrders.length === 0);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string }[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (images: { src: string; alt: string }[], index: number) => {
    if (!images.length) return;
    setLightboxImages(images);
    setLightboxIndex(Math.max(0, Math.min(index, images.length - 1)));
  };

  const closeLightbox = () => setLightboxImages(null);

  const showPrevImage = () => {
    if (!lightboxImages) return;
    setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const showNextImage = () => {
    if (!lightboxImages) return;
    setLightboxIndex((i) => (i + 1) % lightboxImages.length);
  };

  // Get bypass packing stage setting
  const { bypassPackingStage } = useBypassPackingStage();

  const toggleOrderProducts = (orderId: string) => {
    setExpandedOrderIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const getItemVariationDisplay = (item: WooCommerceOrderItem) => {
    const variations = [item.color, item.size].filter(Boolean);

    if (variations.length > 0) {
      return variations.join(' / ');
    }

    const metaVariations = item.meta_data
      ?.filter((meta) => meta.display_value)
      .map((meta) => `${meta.display_key}: ${meta.display_value}`)
      .slice(0, 2);

    return metaVariations?.length ? metaVariations.join(' / ') : 'Standard';
  };

  const stripVariationFromName = (name: string, item: WooCommerceOrderItem) => {
    if (!name) return 'Product Name';
    // Split name at the first " - " — everything before is the base product name,
    // everything after is treated as variation metadata (color, size, etc.).
    const dashIdx = name.search(/\s+[-–—]\s+/);
    if (dashIdx === -1) return name.trim() || 'Product Name';

    const base = name.slice(0, dashIdx).trim();
    const tail = name.slice(dashIdx).replace(/^\s+[-–—]\s+/, '');

    // Tokenize the tail (comma or slash separated) and drop tokens that match
    // the item's color/size. If every token matches, drop the whole tail.
    const tokens = tail.split(/\s*[,/]\s*/).filter(Boolean);
    const variationValues = [item.color, item.size].filter(Boolean).map(v => v!.toLowerCase());
    const remaining = tokens.filter(token => !variationValues.includes(token.toLowerCase()));

    if (remaining.length === 0) return base || 'Product Name';
    return `${base} - ${remaining.join(', ')}`;
  };

  const getOrderProducts = (order: WooCommerceOrder) =>
    (order.line_items || []).map((item, index) => ({
      key: `${item.id || item.product_id || 'item'}-${index}`,
      item,
      image: resolveLineItemImage(item),
      name: stripVariationFromName(item.name || 'Product Name', item),
      quantity: Number(item.quantity) || 1,
      variation: getItemVariationDisplay(item),
      total: Number(item.total || item.price || 0)
    }));

  const calculateOrderWeight = (order: WooCommerceOrder) =>
    (order.line_items || []).reduce((total, item) => {
      const weight = Number(item.weight) || 0.5;
      const quantity = Number(item.quantity) || 1;
      return total + weight * quantity;
    }, 0);

  // Deduplicate orders by (order_number || id). Belt-and-suspenders guard
  // against any backend duplicates so the same order can't appear twice on screen.
  // Also filters out anything that has already left the printing stage so a
  // printed/packed/shipped order can never reappear unless the user manually
  // moves it back to processing (which clears those timestamps).
  const dedupeAndFilterProcessing = (orders: WooCommerceOrder[]): WooCommerceOrder[] => {
    const seen = new Map<string, WooCommerceOrder>();
    for (const o of orders) {
      const key = (o.order_number || o.id || '').toString();
      if (!key) continue;
      const alreadyMoved = !!(o.printed_at || o.packed_at || o.shipped_at || o.delivered_at);
      const wrongStage = o.status && o.status !== 'processing';
      if (alreadyMoved || wrongStage) continue;
      if (!seen.has(key)) seen.set(key, o);
    }
    return Array.from(seen.values());
  };

  // Incrementally merge a fresh list of orders into existing state so the UI
  // doesn't flicker or lose interactions for unchanged rows. Uses the fresh
  // ordering but reuses existing object references when row data is unchanged.
  const mergeOrders = (current: WooCommerceOrder[], fresh: WooCommerceOrder[]): WooCommerceOrder[] => {
    const cleanFresh = dedupeAndFilterProcessing(fresh);
    const currentById = new Map(current.map(o => [(o.order_number || o.id).toString(), o]));
    return cleanFresh.map(freshOrder => {
      const key = (freshOrder.order_number || freshOrder.id).toString();
      const existing = currentById.get(key);
      if (existing && JSON.stringify(existing) === JSON.stringify(freshOrder)) {
        return existing;
      }
      return freshOrder;
    });
  };

  // Fast function to fetch from database without syncing
  const fetchProcessingOrdersFromDB = useCallback(async () => {
    if (!user) return;

    try {
      const processingOrders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setOrders(prev => mergeOrders(prev, processingOrders));
      setFilteredOrders(prev => mergeOrders(prev, processingOrders));
      
      // Also fetch all orders for analytics calculation (including all stages)
      const allOrders = await wooCommerceOrderService.fetchOrders();
      setAllOrdersForAnalytics(allOrders);

      // Cache active orders for instant load next time (uses smart caching)
      setCachedOrders(allOrders);
      
      // Debug: Log orders with printed_at for today
      const todayStr = new Date().toLocaleDateString('en-CA');
      const todayPrintedCount = allOrders.filter(order => {
        if (!order.printed_at) return false;
        const printedDate = new Date(order.printed_at);
        const printedDateStr = printedDate.toLocaleDateString('en-CA');
        return printedDateStr === todayStr;
      }).length;
      
      const ordersWithPrintedAt = allOrders.filter(o => o.printed_at).length;
      console.log(`📊 PrintingPage: Fetched ${allOrders.length} total orders (all stages)`);
      console.log(`📊 PrintingPage: Orders with printed_at: ${ordersWithPrintedAt}`);
      console.log(`📊 PrintingPage: Orders printed today: ${todayPrintedCount}`);
      
      // Debug: Show stage distribution
      const stageCounts = allOrders.reduce((acc, o) => {
        const stage = o.stage || o.status || 'unknown';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📊 PrintingPage: Stage distribution:`, stageCounts);
      
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
      
      // Also fetch all orders for analytics calculation (including all stages)
      const allOrders = await wooCommerceOrderService.fetchOrders();
      setAllOrdersForAnalytics(allOrders);

      // Cache active orders for instant load next time (uses smart caching)
      setCachedOrders(allOrders);
      
      // Debug: Log orders with printed_at for today
      const todayStr = new Date().toLocaleDateString('en-CA');
      const todayPrintedCount = allOrders.filter(order => {
        if (!order.printed_at) return false;
        const printedDate = new Date(order.printed_at);
        const printedDateStr = printedDate.toLocaleDateString('en-CA');
        return printedDateStr === todayStr;
      }).length;
      
      const ordersWithPrintedAt = allOrders.filter(o => o.printed_at).length;
      console.log(`📊 PrintingPage: Fetched ${allOrders.length} total orders (all stages)`);
      console.log(`📊 PrintingPage: Orders with printed_at: ${ordersWithPrintedAt}`);
      console.log(`📊 PrintingPage: Orders printed today: ${todayPrintedCount}`);
      
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
      console.log('🔄 Starting manual WooCommerce sync...');
      
      // Force sync regardless of last sync time
      syncCoordinator.markSyncStarted();
      await loadProcessingOrders(true); // Pass true to sync
      syncCoordinator.markSyncCompleted();
      
      toast.success('Successfully synced orders from WooCommerce');
    } catch (error: any) {
      console.error('Error syncing from WooCommerce:', error);
      syncCoordinator.markSyncFailed();
      toast.error(`Failed to sync orders: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = async (order: WooCommerceOrder) => {
    console.log('Printing order:', order.order_number);
    // Don't move order here - wait for actual print confirmation
  };

  // Remove order(s) from local state immediately so they vanish from Printing
  // (and Products Pending via realtime) without waiting for the DB roundtrip.
  const removeOrdersLocally = (orderIds: string[]) => {
    const idSet = new Set(orderIds);
    setOrders(prev => prev.filter(o => !idSet.has(o.id)));
    setFilteredOrders(prev => prev.filter(o => !idSet.has(o.id)));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      for (const id of orderIds) next.delete(id);
      return next;
    });
  };

  const moveToPackingStage = async (orderId: string) => {
    // Optimistically remove from UI first
    removeOrdersLocally([orderId]);
    try {
      const targetStage = bypassPackingStage ? 'packed' : 'packing';
      await wooCommerceOrderService.updateOrderStage(orderId, targetStage);
      // updateOrderStage already shows success toast
    } catch (error: any) {
      console.error('Error moving order:', error);
      toast.error(`Failed to move order to ${bypassPackingStage ? 'tracking' : 'packing'} stage`);
      // On failure, refetch to restore correct state
      try { await fetchProcessingOrdersFromDB(); } catch {}
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
        company_name: settings.company_name || 'Company',
        address_line1: settings.address_line1 || '',
        address_line2: settings.address_line2 || '',
        city: settings.city || '',
        state: settings.state || '',
        postal_code: settings.postal_code || '',
        country: settings.country || '',
        phone: settings.phone || '',
        email: settings.email || ''
      } : {
        company_name: 'Company',
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
      const PrintPackingSlip4x6 = (await import('./print/PrintPackingSlip4x6')).default;
      const PrintComponent = format === 'thermal' ? PrintPackingSlip4x6 : format === 'A5' ? PrintPackingSlipA5 : PrintPackingSlipA4;

      // Import JsBarcode for barcode generation
      const JsBarcode = (await import('jsbarcode')).default;

      // Generate barcodes for all orders
      const ordersWithBarcodes = await Promise.all(selectedOrders.map(async (order) => {
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, order.order_number, {
            format: "CODE128",
            width: format === 'thermal' ? 1 : format === 'A5' ? 1.2 : 2,
            height: format === 'thermal' ? 30 : format === 'A5' ? 35 : 60,
            displayValue: true,
            fontSize: format === 'thermal' ? 10 : format === 'A5' ? 20 : 18,
            margin: format === 'thermal' ? 3 : format === 'A5' ? 5 : 10,
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
      // Use page-break-before to ensure each order starts on a new page
      const bulkPrintContent = React.createElement('div', {
        style: { width: '100%' }
      }, ordersWithBarcodes.map((order, index) => 
        React.createElement('div', {
          key: order.id,
          className: 'packing-slip-page',
          style: {
            pageBreakBefore: index > 0 ? 'always' : 'auto', // Force new page for each order except first
            pageBreakAfter: index < ordersWithBarcodes.length - 1 ? 'always' : 'auto', // Also add after for safety
            pageBreakInside: 'auto', // Allow content to span multiple pages if needed
            minHeight: format === 'thermal' ? '6in' : format === 'A5' ? '8.27in' : '11in', // Minimum height for proper page sizing
            width: format === 'thermal' ? '4in' : format === 'A5' ? '5.83in' : '8.27in',
            margin: '0 auto',
            display: 'block',
            position: 'relative'
          }
        }, React.createElement(PrintComponent, {
          order: order,
          companySettings: companySettings,
          barcodeDataUrl: order.barcodeDataUrl
        }))
      ));

      // Render the bulk content
      root.render(bulkPrintContent);

      // Wait for rendering to complete
      setTimeout(() => {
        const printedContent = printContainer.innerHTML;

        // Set up print window with styles - ensure one order per page
        const pageSize = format === 'thermal' ? '4in 6in' : format === 'A5' ? 'A5' : 'A4';
        const pageMargin = format === 'thermal' ? '0.1in' : format === 'A5' ? '0.3in' : '0.75in';
        
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
                .packing-slip-page {
                  page-break-before: always !important;
                  page-break-after: always !important;
                  page-break-inside: auto !important;
                  width: ${format === 'thermal' ? '4in' : format === 'A5' ? '5.83in' : '8.27in'};
                  min-height: ${format === 'thermal' ? '6in' : format === 'A5' ? '8.27in' : '11in'};
                  margin: 0 auto;
                  display: block;
                  position: relative;
                }
                .packing-slip-page:first-child {
                  page-break-before: auto !important;
                }
                .packing-slip-page:last-child {
                  page-break-after: auto !important;
                }
                /* Override component fixed height to allow multi-page content */
                .packing-slip-page > div {
                  height: auto !important;
                  min-height: ${format === 'thermal' ? '6in' : format === 'A5' ? '8.27in' : '11in'} !important;
                  max-height: none !important;
                  overflow: visible !important;
                  page-break-inside: auto !important;
                  page-break-after: auto !important;
                }
                /* Ensure each order wrapper forces a new page */
                .packing-slip-page + .packing-slip-page {
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
            
            // Optimistically remove the printed orders from local state so they
            // disappear instantly. The realtime/fetch below will reconcile.
            removeOrdersLocally(orderIdsToMove);
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

    const normalizeValue = (value: string) => value.toLowerCase().trim();

    const getBaseProductName = (name: string): string => {
      return name.split(' - ')[0].trim();
    };

    const itemMatchesSelectedProduct = (item: any) => {
      if (!filters.product || filters.product === 'any') return true;
      return normalizeValue(getBaseProductName(item.name || '')) === normalizeValue(filters.product);
    };

    const itemMatchesSelectedColor = (item: any) => {
      if (!filters.color || filters.color === 'any') return true;
      return !!item.color && normalizeValue(item.color) === normalizeValue(filters.color);
    };

    const itemMatchesSelectedSize = (item: any) => {
      if (!filters.size || filters.size === 'any') return true;
      return !!item.size && normalizeValue(item.size) === normalizeValue(filters.size);
    };

    const matchingItemsForOrder = (order: WooCommerceOrder) =>
      (order.line_items || []).filter(item => itemMatchesSelectedProduct(item));

    const matchingItemsForOrderAndColor = (order: WooCommerceOrder) =>
      matchingItemsForOrder(order).filter(item => itemMatchesSelectedColor(item));

    const matchingItemsForOrderAndColorAndSize = (order: WooCommerceOrder) =>
      matchingItemsForOrderAndColor(order).filter(item => itemMatchesSelectedSize(item));

    // Apply product filter
    if (filters.product && filters.product !== 'any') {
      filtered = filtered.filter(order => 
        matchingItemsForOrder(order).length > 0
      );
    }

    // Apply color filter
    if (filters.color && filters.color !== 'any') {
      filtered = filtered.filter(order => 
        matchingItemsForOrderAndColor(order).length > 0
      );
    }

    // Apply size filter
    if (filters.size && filters.size !== 'any') {
      filtered = filtered.filter(order => 
        matchingItemsForOrderAndColorAndSize(order).length > 0
      );
    }

    // Apply variation filter - check against variation_id or create combined variation from available properties
    if (filters.variation && filters.variation !== 'any') {
      filtered = filtered.filter(order => 
        matchingItemsForOrderAndColorAndSize(order).some(item => {
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

  // Load orders on component mount - fetch from DB first (fast), then sync in background ONLY IF NEEDED
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadInitial = async () => {
      // Only show the loader when we couldn't render anything from cache.
      const hadCachedOrders = loadCachedOrders().processingOrders.length > 0;
      if (!hadCachedOrders) {
        setLoading(true);
      }

      try {
        // Always fetch from DB in the background (fast - DB query).
        // If we had cache, the UI stays interactive while this refreshes silently.
        await fetchProcessingOrdersFromDB();
      } finally {
        if (isMounted && !hadCachedOrders) {
          setLoading(false);
        }
      }
    };

    loadInitial();
    
    // Smart background sync - only sync from WooCommerce if needed
    setTimeout(async () => {
      // Check if sync is needed (hasn't been done recently)
      if (!syncCoordinator.shouldSync()) {
        console.log('⏭️ Skipping WooCommerce sync - recently synced');
        return;
      }

      // Check if another tab/page is already syncing
      if (syncCoordinator.isSyncInProgress()) {
        console.log('⏭️ Skipping WooCommerce sync - already in progress');
        return;
      }

      try {
        console.log('🔄 Starting background WooCommerce sync...');
        syncCoordinator.markSyncStarted();

        await wooCommerceOrderService.syncOrdersFromWooCommerce();

        syncCoordinator.markSyncCompleted();
        console.log('✅ Background sync completed (UI not auto-refreshed — use Sync button to load new data)');
        // Intentionally NOT calling fetchProcessingOrdersFromDB() here.
        // Auto-refreshing the list while the user is interacting (selecting,
        // expanding, scrolling) disrupts their work. Use the Sync button to pull updates.
      } catch (error) {
        console.error('Background sync error:', error);
        syncCoordinator.markSyncFailed();
        // Don't show error toast for background sync
      }
    }, 100);

    return () => {
      isMounted = false;
    };
  }, [user, fetchProcessingOrdersFromDB]);

  // Apply filters when search query changes
  useEffect(() => {
    handleFiltersChange({});
  }, [searchQuery]);

  // Realtime: subscribe to the orders table so new orders appear instantly,
  // moved/printed orders disappear instantly, and edits update in place —
  // all WITHOUT triggering a full page reload or loading spinner.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`printing-page-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          // Re-fetch silently and merge. The mergeOrders helper preserves
          // identity for unchanged rows, so React only re-renders what changed.
          fetchProcessingOrdersFromDB();
        }
      )
      .subscribe();

    // Refetch when the tab regains focus, in case realtime missed an event
    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchProcessingOrdersFromDB();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [user, fetchProcessingOrdersFromDB]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImages) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showPrevImage();
      else if (e.key === 'ArrowRight') showNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImages]);

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
            {paginatedOrders.map((order) => {
              const products = getOrderProducts(order);
              const visibleProducts = products.slice(0, 4);
              const hiddenProductCount = Math.max(products.length - visibleProducts.length, 0);
              const isExpanded = expandedOrderIds.has(order.id);
              const totalWeight = calculateOrderWeight(order);
              const orderImages = products
                .filter(p => p.image)
                .map(p => ({ src: p.image as string, alt: p.name }));

              return (
              <Collapsible
                key={order.id}
                open={isExpanded}
                onOpenChange={() => toggleOrderProducts(order.id)}
              >
              <div className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  {/* Left side - Checkbox and Order Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, Boolean(checked))}
                      className="mt-1"
                    />

                    {/* Ordered product images */}
                    <div className="flex w-[112px] flex-shrink-0 flex-wrap gap-1">
                      {visibleProducts.length > 0 ? visibleProducts.map((product) => (
                        product.image ? (
                          <img
                            key={product.key}
                            src={product.image}
                            alt={product.name}
                            className="h-10 w-10 cursor-zoom-in rounded border border-gray-200 object-cover transition-transform hover:scale-105"
                            onClick={() => openLightbox(orderImages, orderImages.findIndex(i => i.src === product.image))}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div key={product.key} className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-gray-100 text-gray-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )
                      )) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-gray-100 text-gray-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      {hiddenProductCount > 0 && (
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-gray-900 text-xs font-semibold text-white">
                          +{hiddenProductCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-8">
                        {/* Order Number and Customer */}
                        <div className="min-w-0 flex-shrink-0" style={{ width: '140px' }}>
                          <div className="font-semibold text-gray-900">#{order.order_number}</div>
                          <div className="text-sm text-gray-600 truncate">{order.customer_name}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {products.length} product{products.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        {/* Products */}
                        <div className="flex-1 min-w-0" style={{ width: '240px' }}>
                          <div className="mb-1 flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">Products:</div>
                            <CollapsibleTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                {isExpanded ? 'Hide' : 'View all'}
                                <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          {products.slice(0, 2).map((product) => (
                            <div key={product.key} className="text-sm">
                              <div className="truncate text-gray-900">{product.name}</div>
                              <div className="text-blue-600">
                                Qty {product.quantity} / {product.variation}
                              </div>
                            </div>
                          ))}
                          {products.length > 2 && (
                            <div className="text-xs text-gray-500">
                              {products.length - 2} more product{products.length - 2 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-shrink-0" style={{ width: '120px' }}>
                          <div className="text-sm font-medium text-gray-900 mb-1">Details:</div>
                          <div className="text-sm text-gray-600">
                            {totalWeight.toFixed(0)}g
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
                          {order.alternate_phone && (
                            <div className="text-sm text-gray-500 mt-1">
                              📞 Alt: {order.alternate_phone}
                            </div>
                          )}
                          {order.whatsapp_number && (
                            <div className="text-sm text-green-600 mt-1">
                              💬 WA: {order.whatsapp_number}
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
                            // Optimistically remove from UI first
                            removeOrdersLocally([order.id]);
                            try {
                              const targetStage = bypassPackingStage ? 'packed' : 'packing';
                              await wooCommerceOrderService.updateOrderStage(order.id, targetStage);
                            } catch (error: any) {
                              console.error('Error moving order:', error);
                              toast.error(`Failed to move order to ${bypassPackingStage ? 'tracking' : 'packing'} stage`);
                              // On failure, refetch to restore correct state
                              try { await fetchProcessingOrdersFromDB(); } catch {}
                            }
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="ml-[156px] mt-4 rounded-md border border-gray-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {products.length > 0 ? products.map((product) => (
                        <div key={product.key} className="flex gap-3 rounded border border-gray-100 bg-gray-50 p-2">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-16 w-16 flex-shrink-0 cursor-zoom-in rounded border border-gray-200 object-cover transition-transform hover:scale-105"
                              onClick={() => openLightbox(orderImages, orderImages.findIndex(i => i.src === product.image))}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 text-gray-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="mt-1 text-sm text-blue-600">{product.variation}</div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                              <span>Qty: {product.quantity}</span>
                              <span>Amount: Rs {product.total.toFixed(0)}</span>
                              {product.item.sku && <span>SKU: {product.item.sku}</span>}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-sm text-gray-500">No products found for this order.</div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
              </Collapsible>
            )})}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImages && lightboxImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            key={lightboxIndex}
            src={lightboxImages[lightboxIndex].src}
            alt={lightboxImages[lightboxIndex].alt}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 flex-col items-center gap-1">
            {lightboxImages[lightboxIndex].alt && (
              <div className="max-w-full truncate rounded bg-black/60 px-4 py-2 text-sm text-white">
                {lightboxImages[lightboxIndex].alt}
              </div>
            )}
            {lightboxImages.length > 1 && (
              <div className="rounded bg-black/60 px-3 py-1 text-xs text-white">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}
          </div>
        </div>
      )}

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
