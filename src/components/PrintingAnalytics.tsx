
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
  // Calculate today's printed count based on printed_at field
  const todayPrinted = useMemo(() => {
    if (!allOrders || allOrders.length === 0) {
      console.log('📊 PrintingAnalytics: No orders provided for today printed calculation');
      return 0;
    }
    
    // Get today's date range (start of today to start of tomorrow) in local timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Filter orders printed today
    const printedToday = allOrders.filter(order => {
      if (!order.printed_at) return false;
      
      try {
        // Parse the printed_at date (ISO string from database)
        const printedDate = new Date(order.printed_at);
        
        // Check if printed date is within today's range
        // Compare dates by converting to local date strings (YYYY-MM-DD) for timezone-independent comparison
        const printedDateStr = printedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const todayStr = today.toLocaleDateString('en-CA');
        
        const isToday = printedDateStr === todayStr;
        
        return isToday;
      } catch (error) {
        console.error(`Error parsing printed_at date for order ${order.order_number}:`, order.printed_at, error);
        return false;
      }
    });
    
    console.log(`📊 PrintingAnalytics: Today printed count: ${printedToday.length} out of ${allOrders.length} total orders`);
    console.log(`📊 PrintingAnalytics: Today's date: ${today.toLocaleDateString('en-CA')}`);
    if (printedToday.length > 0) {
      console.log(`📊 PrintingAnalytics: Sample printed orders:`, printedToday.slice(0, 3).map(o => ({
        order: o.order_number,
        printed_at: o.printed_at,
        date: new Date(o.printed_at).toLocaleDateString('en-CA')
      })));
    } else {
      // Debug: Show some orders with printed_at to see what we're getting
      const ordersWithPrintedAt = allOrders.filter(o => o.printed_at).slice(0, 3);
      if (ordersWithPrintedAt.length > 0) {
        console.log(`📊 PrintingAnalytics: Sample orders with printed_at (not today):`, ordersWithPrintedAt.map(o => ({
          order: o.order_number,
          printed_at: o.printed_at,
          date: new Date(o.printed_at).toLocaleDateString('en-CA')
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
