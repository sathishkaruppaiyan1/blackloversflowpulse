import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryData, ProductData, DateRangePreset, getVariationKey } from "@/hooks/useAnalyticsData";
import { WooCommerceOrder } from "@/services/wooCommerceOrderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { AnalyticsDateFilter } from "./AnalyticsDateFilter";
import { Button } from "@/components/ui/button";

interface CategoryBreakdownModalProps {
  category: CategoryData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allOrders: WooCommerceOrder[];
  productCategoryMap: Map<string, string>;
  onProductClick: (product: ProductData) => void;
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

export const CategoryBreakdownModal = ({
  category, open, onOpenChange, allOrders, productCategoryMap, onProductClick,
}: CategoryBreakdownModalProps) => {
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const computed = useMemo(() => {
    if (!category) return null;

    const { start, end } = dateRange === 'all' && !customStart
      ? { start: null, end: null }
      : customStart && customEnd
        ? { start: customStart, end: customEnd }
        : getDateRangeLocal(dateRange);

    // Get product names in this category
    const categoryProductNames = new Set<string>();
    for (const p of category.products) {
      categoryProductNames.add(p.name);
    }

    const productMap = new Map<string, ProductData>();

    for (const order of allOrders) {
      if (start || end) {
        const orderDate = new Date(order.order_date || order.created_at);
        if (start && orderDate < start) continue;
        if (end && orderDate > end) continue;
      }

      for (const item of order.line_items || []) {
        const name = item.name || 'Unknown Product';
        if (!categoryProductNames.has(name)) continue;

        const qty = item.quantity || 1;
        const revenue = parseFloat(item.total) || 0;
        const variationKey = getVariationKey(item);

        const existing = productMap.get(name) || {
          name, totalQuantity: 0, totalRevenue: 0, avgPrice: 0, variations: [],
        };
        existing.totalQuantity += qty;
        existing.totalRevenue += revenue;

        const existingVar = existing.variations.find(v => v.variationKey === variationKey);
        if (existingVar) {
          existingVar.quantitySold += qty;
          existingVar.revenue += revenue;
        } else {
          existing.variations.push({ variationKey, quantitySold: qty, revenue });
        }
        productMap.set(name, existing);
      }
    }

    const products = Array.from(productMap.values()).map(p => ({
      ...p, avgPrice: p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalQuantity = products.reduce((s, p) => s + p.totalQuantity, 0);
    const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);

    return { products, totalQuantity, totalRevenue, productCount: products.length };
  }, [category, allOrders, dateRange, customStart, customEnd]);

  if (!category || !computed) return null;

  const chartData = computed.products.slice(0, 15).map(p => ({
    name: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name,
    revenue: Math.round(p.totalRevenue),
    quantity: p.totalQuantity,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{category.name}</DialogTitle>
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
              <div className="text-2xl font-bold text-primary">{computed.productCount}</div>
              <div className="text-xs text-muted-foreground">Products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{computed.totalQuantity}</div>
              <div className="text-xs text-muted-foreground">Total Qty</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {"\u20B9"}{Math.round(computed.totalRevenue).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Revenue by Product</h4>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0088FE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Products Table */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Products in this Category</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-right p-2 font-medium">Qty</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium">Avg Price</th>
                  <th className="text-right p-2 font-medium">Variations</th>
                </tr>
              </thead>
              <tbody>
                {computed.products.length > 0 ? (
                  computed.products.map((prod, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-left font-medium text-primary"
                          onClick={() => onProductClick(prod)}
                        >
                          {prod.name}
                        </Button>
                      </td>
                      <td className="p-2 text-right">{prod.totalQuantity}</td>
                      <td className="p-2 text-right">{"\u20B9"}{Math.round(prod.totalRevenue).toLocaleString()}</td>
                      <td className="p-2 text-right">{"\u20B9"}{Math.round(prod.avgPrice).toLocaleString()}</td>
                      <td className="p-2 text-right">{prod.variations.length}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">No data for selected period</td>
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
