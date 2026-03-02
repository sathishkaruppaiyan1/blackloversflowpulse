import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ProductData, VariationData, DateRangePreset, getVariationKey } from "@/hooks/useAnalyticsData";
import { WooCommerceOrder } from "@/services/wooCommerceOrderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { AnalyticsDateFilter } from "./AnalyticsDateFilter";

interface ProductVariationModalProps {
  product: ProductData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allOrders: WooCommerceOrder[];
}

function getDateRangeLocal(preset: DateRangePreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { start: todayStart, end: now };
    case '7days': { const s = new Date(todayStart); s.setDate(s.getDate() - 6); return { start: s, end: now }; }
    case '30days': { const s = new Date(todayStart); s.setDate(s.getDate() - 29); return { start: s, end: now }; }
    case '90days': { const s = new Date(todayStart); s.setDate(s.getDate() - 89); return { start: s, end: now }; }
    case 'all': return { start: null, end: null };
    default: return { start: null, end: null };
  }
}

export const ProductVariationModal = ({ product, open, onOpenChange, allOrders }: ProductVariationModalProps) => {
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  // Recompute variation data from raw orders filtered by the modal's own date range
  const computedProduct = useMemo<ProductData | null>(() => {
    if (!product) return null;

    const { start, end } = dateRange === 'all' && !customStart
      ? { start: null, end: null }
      : customStart && customEnd
        ? { start: customStart, end: customEnd }
        : getDateRangeLocal(dateRange);

    const variations: VariationData[] = [];
    let totalQuantity = 0;
    let totalRevenue = 0;

    for (const order of allOrders) {
      // Date filter
      if (start || end) {
        const orderDate = new Date(order.order_date || order.created_at);
        if (start && orderDate < start) continue;
        if (end && orderDate > end) continue;
      }

      for (const item of order.line_items || []) {
        if ((item.name || 'Unknown Product') !== product.name) continue;

        const qty = item.quantity || 1;
        const revenue = parseFloat(item.total) || 0;
        const variationKey = getVariationKey(item);

        totalQuantity += qty;
        totalRevenue += revenue;

        const existing = variations.find(v => v.variationKey === variationKey);
        if (existing) {
          existing.quantitySold += qty;
          existing.revenue += revenue;
        } else {
          variations.push({ variationKey, quantitySold: qty, revenue });
        }
      }
    }

    return {
      name: product.name,
      totalQuantity,
      totalRevenue,
      avgPrice: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
      variations,
    };
  }, [product, allOrders, dateRange, customStart, customEnd]);

  if (!computedProduct) return null;

  const chartData = [...computedProduct.variations]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .map(v => ({
      name: v.variationKey.length > 20 ? v.variationKey.slice(0, 17) + '...' : v.variationKey,
      fullName: v.variationKey,
      quantity: v.quantitySold,
      revenue: Math.round(v.revenue),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{computedProduct.name}</DialogTitle>
        </DialogHeader>

        {/* Date Filter */}
        <AnalyticsDateFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStartDate={customStart}
          customEndDate={customEnd}
          onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{computedProduct.totalQuantity}</div>
              <div className="text-xs text-muted-foreground">Total Qty</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {"\u20B9"}{Math.round(computedProduct.totalRevenue).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{computedProduct.variations.length}</div>
              <div className="text-xs text-muted-foreground">Variations</div>
            </CardContent>
          </Card>
        </div>

        {/* Variation Chart */}
        {chartData.length > 1 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Quantity by Variation</h4>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'quantity' ? [value, 'Quantity'] : [`\u20B9${value.toLocaleString()}`, 'Revenue']
                  }
                />
                <Bar dataKey="quantity" fill="#8884d8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Variation Table */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Variation Details</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Variation</th>
                  <th className="text-right p-2 font-medium">Qty</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {computedProduct.variations.length > 0 ? (
                  [...computedProduct.variations]
                    .sort((a, b) => b.quantitySold - a.quantitySold)
                    .map((v, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{v.variationKey}</td>
                        <td className="p-2 text-right">{v.quantitySold}</td>
                        <td className="p-2 text-right">{"\u20B9"}{Math.round(v.revenue).toLocaleString()}</td>
                        <td className="p-2 text-right">
                          {"\u20B9"}{v.quantitySold > 0 ? Math.round(v.revenue / v.quantitySold).toLocaleString() : 0}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">No data for selected period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
