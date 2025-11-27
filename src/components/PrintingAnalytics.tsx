
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Printer } from 'lucide-react';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';

interface PrintingAnalyticsProps {
  totalOrders: number;
  selectedCount: number;
  allOrders?: WooCommerceOrder[]; // All orders to calculate today's printed count
}

export const PrintingAnalytics: React.FC<PrintingAnalyticsProps> = ({ 
  totalOrders, 
  selectedCount,
  allOrders = []
}) => {
  // Debug: Log when allOrders changes
  React.useEffect(() => {
    console.log(`🔍 PrintingAnalytics: allOrders prop changed. Length: ${allOrders.length}`);
    if (allOrders.length > 0) {
      const withPrintedAt = allOrders.filter(o => o.printed_at);
      console.log(`🔍 PrintingAnalytics: Orders with printed_at: ${withPrintedAt.length}`);
      if (withPrintedAt.length > 0) {
        console.log(`🔍 PrintingAnalytics: First order with printed_at:`, {
          order: withPrintedAt[0].order_number,
          printed_at: withPrintedAt[0].printed_at,
          stage: withPrintedAt[0].stage || withPrintedAt[0].status
        });
      }
    }
  }, [allOrders]);

  // Calculate today's printed count based on printed_at field
  const todayPrinted = useMemo(() => {
    if (!allOrders || allOrders.length === 0) {
      console.log('📊 PrintingAnalytics: No orders provided for today printed calculation');
      return 0;
    }
    
    // Get today's date string in local timezone (YYYY-MM-DD format)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
    
    // Also get today's date components for alternative comparison
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    
    console.log(`🔍 PrintingAnalytics: Calculating today printed. Today: ${todayStr} (${todayYear}-${todayMonth + 1}-${todayDay})`);
    
    // Filter orders printed today by comparing date strings
    const printedToday = allOrders.filter(order => {
      if (!order.printed_at) {
        return false;
      }
      
      try {
        // Parse the printed_at date (ISO string from database, may be in UTC)
        const printedDate = new Date(order.printed_at);
        
        // Method 1: Compare using toLocaleDateString
        const printedDateStr = printedDate.toLocaleDateString('en-CA');
        const isTodayByString = printedDateStr === todayStr;
        
        // Method 2: Compare using date components (backup method)
        const printedYear = printedDate.getFullYear();
        const printedMonth = printedDate.getMonth();
        const printedDay = printedDate.getDate();
        const isTodayByComponents = printedYear === todayYear && 
                                    printedMonth === todayMonth && 
                                    printedDay === todayDay;
        
        // Use either method (they should match, but this is more robust)
        const isToday = isTodayByString || isTodayByComponents;
        
        return isToday;
      } catch (error) {
        console.error(`Error parsing printed_at date for order ${order.order_number}:`, order.printed_at, error);
        return false;
      }
    });
    
    const todayCount = printedToday.length;
    console.log(`📊 PrintingAnalytics: Today printed count: ${todayCount} out of ${allOrders.length} total orders`);
    console.log(`📊 PrintingAnalytics: Today's date: ${todayStr}`);
    console.log(`📊 PrintingAnalytics: Total orders with printed_at: ${allOrders.filter(o => o.printed_at).length}`);
    
    if (todayCount > 0) {
      console.log(`📊 PrintingAnalytics: ✅ Sample printed orders TODAY:`, printedToday.slice(0, 5).map(o => {
        const d = new Date(o.printed_at);
        return {
          order: o.order_number,
          printed_at: o.printed_at,
          date: d.toLocaleDateString('en-CA'),
          dateComponents: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
          stage: o.stage || o.status
        };
      }));
    } else {
      // Debug: Show some orders with printed_at to see what we're getting
      const ordersWithPrintedAt = allOrders.filter(o => o.printed_at).slice(0, 10);
      if (ordersWithPrintedAt.length > 0) {
        console.log(`📊 PrintingAnalytics: ⚠️ Sample orders with printed_at (NOT today):`, ordersWithPrintedAt.map(o => {
          const d = new Date(o.printed_at);
          return {
            order: o.order_number,
            printed_at: o.printed_at,
            date: d.toLocaleDateString('en-CA'),
            stage: o.stage || o.status,
            isToday: d.toLocaleDateString('en-CA') === todayStr
          };
        }));
      } else {
        console.log(`📊 PrintingAnalytics: ❌ No orders found with printed_at field in allOrders array`);
        console.log(`📊 PrintingAnalytics: Debug - allOrders array length: ${allOrders.length}`);
        console.log(`📊 PrintingAnalytics: Debug - Sample order stages:`, allOrders.slice(0, 5).map(o => ({
          order: o.order_number,
          stage: o.stage || o.status,
          printed_at: o.printed_at || 'NULL'
        })));
      }
    }
    
    return printedToday.length;
  }, [allOrders]);

  // Calculate ready for packing (orders that have been printed but not yet packed)
  const readyForPacking = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return 0;
    
    return allOrders.filter(order => {
      // Orders that have been printed (have printed_at) but not yet packed (no packed_at or stage is still packing)
      return order.printed_at && !order.packed_at && (order.stage === 'packing' || order.stage === 'processing');
    }).length;
  }, [allOrders]);

  const readyForPrinting = totalOrders;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Today Printed */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Today Printed</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{todayPrinted}</div>
          <div className="text-xs text-gray-500">Labels printed today</div>
        </CardContent>
      </Card>

      {/* Ready for Printing */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Ready for Printing</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{readyForPrinting}</div>
          <div className="text-xs text-gray-500">Orders awaiting labels</div>
        </CardContent>
      </Card>

      {/* Ready for Packing */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Ready for Packing</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{readyForPacking}</div>
          <div className="text-xs text-gray-500">Printed orders</div>
        </CardContent>
      </Card>

      {/* Selected */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Selected</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{selectedCount}</div>
          <div className="text-xs text-gray-500">For batch printing</div>
        </CardContent>
      </Card>
    </div>
  );
};
