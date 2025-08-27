
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Printer } from 'lucide-react';

interface PrintingAnalyticsProps {
  totalOrders: number;
  selectedCount: number;
}

export const PrintingAnalytics: React.FC<PrintingAnalyticsProps> = ({ 
  totalOrders, 
  selectedCount 
}) => {
  // Calculate analytics based on current data
  const todayPrinted = 0; // This would come from actual data
  const readyForPrinting = totalOrders;
  const readyForPacking = 0; // This would come from orders moved to packing today

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
