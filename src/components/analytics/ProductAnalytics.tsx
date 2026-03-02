import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, IndianRupee, Star, ArrowUpDown, FolderOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useAnalyticsData, DateRangePreset, ProductData, CategoryData } from "@/hooks/useAnalyticsData";
import { AnalyticsDateFilter } from "./AnalyticsDateFilter";
import { ProductVariationModal } from "./ProductVariationModal";
import { CategoryBreakdownModal } from "./CategoryBreakdownModal";
import { Button } from "@/components/ui/button";

type SortKey = 'name' | 'totalQuantity' | 'totalRevenue' | 'avgPrice' | 'variations';
type CatSortKey = 'name' | 'productCount' | 'totalQuantity' | 'totalRevenue' | 'avgPrice';
type SortDir = 'asc' | 'desc';

export const ProductAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30days");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  // Product table sort
  const [sortKey, setSortKey] = useState<SortKey>('totalQuantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Category table sort
  const [catSortKey, setCatSortKey] = useState<CatSortKey>('totalRevenue');
  const [catSortDir, setCatSortDir] = useState<SortDir>('desc');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const { loading, productAnalytics, allOrders, productCategoryMap } = useAnalyticsData({
    dateRange,
    customStartDate: customStart,
    customEndDate: customEnd,
  });

  const p = productAnalytics;

  // Product sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTable = [...p.productTable].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'totalQuantity': cmp = a.totalQuantity - b.totalQuantity; break;
      case 'totalRevenue': cmp = a.totalRevenue - b.totalRevenue; break;
      case 'avgPrice': cmp = a.avgPrice - b.avgPrice; break;
      case 'variations': cmp = a.variations.length - b.variations.length; break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Category sort
  const handleCatSort = (key: CatSortKey) => {
    if (catSortKey === key) {
      setCatSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setCatSortKey(key);
      setCatSortDir('desc');
    }
  };

  const sortedCategories = [...p.categoryTable].sort((a, b) => {
    let cmp = 0;
    switch (catSortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'productCount': cmp = a.productCount - b.productCount; break;
      case 'totalQuantity': cmp = a.totalQuantity - b.totalQuantity; break;
      case 'totalRevenue': cmp = a.totalRevenue - b.totalRevenue; break;
      case 'avgPrice': cmp = a.avgPrice - b.avgPrice; break;
    }
    return catSortDir === 'asc' ? cmp : -cmp;
  });

  const SortHeader = ({ label, colKey, onClick, activeKey, activeDir }: {
    label: string; colKey: string;
    onClick: (key: any) => void; activeKey: string; activeDir: SortDir;
  }) => (
    <th
      className="p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
      onClick={() => onClick(colKey)}
    >
      <div className={`flex items-center gap-1 ${colKey === 'name' ? '' : 'justify-end'}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${activeKey === colKey ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customStartDate={customStart}
        customEndDate={customEnd}
        onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{loading ? "..." : p.totalProductsSold}</div>
                <div className="text-sm text-muted-foreground">Products Sold</div>
              </div>
              <Package className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-600 truncate max-w-[150px]" title={p.topProduct}>
                  {loading ? "..." : p.topProduct}
                </div>
                <div className="text-sm text-muted-foreground">Top Product</div>
              </div>
              <Star className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-orange-600 truncate max-w-[150px]" title={p.mostPopularVariation}>
                  {loading ? "..." : p.mostPopularVariation}
                </div>
                <div className="text-sm text-muted-foreground">Top Variation</div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? "..." : `\u20B9${Math.round(p.totalRevenue).toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <IndianRupee className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Product (Top 15)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : p.revenueByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, p.revenueByProduct.length * 30)}>
                <BarChart data={p.revenueByProduct} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No product data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantity Sold by Product (Top 15)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : p.quantityByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, p.quantityByProduct.length * 30)}>
                <BarChart data={p.quantityByProduct} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Quantity']} />
                  <Bar dataKey="quantity" fill="#8884d8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No product data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Breakdown</CardTitle>
          <CardDescription>Click a product name to see variation details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedTable.length > 0 ? (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <SortHeader label="Product Name" colKey="name" onClick={handleSort} activeKey={sortKey} activeDir={sortDir} />
                    <SortHeader label="Qty Sold" colKey="totalQuantity" onClick={handleSort} activeKey={sortKey} activeDir={sortDir} />
                    <SortHeader label="Revenue" colKey="totalRevenue" onClick={handleSort} activeKey={sortKey} activeDir={sortDir} />
                    <SortHeader label="Avg Price" colKey="avgPrice" onClick={handleSort} activeKey={sortKey} activeDir={sortDir} />
                    <SortHeader label="Variations" colKey="variations" onClick={handleSort} activeKey={sortKey} activeDir={sortDir} />
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((prod, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-left font-medium text-primary"
                          onClick={() => { setSelectedProduct(prod); setProductModalOpen(true); }}
                        >
                          {prod.name}
                        </Button>
                      </td>
                      <td className="p-3 text-right">{prod.totalQuantity}</td>
                      <td className="p-3 text-right">{"\u20B9"}{Math.round(prod.totalRevenue).toLocaleString()}</td>
                      <td className="p-3 text-right">{"\u20B9"}{Math.round(prod.avgPrice).toLocaleString()}</td>
                      <td className="p-3 text-right">{prod.variations.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No product data available</div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Category Breakdown
          </CardTitle>
          <CardDescription>Click a category name to see products within it</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedCategories.length > 0 ? (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <SortHeader label="Category" colKey="name" onClick={handleCatSort} activeKey={catSortKey} activeDir={catSortDir} />
                    <SortHeader label="Products" colKey="productCount" onClick={handleCatSort} activeKey={catSortKey} activeDir={catSortDir} />
                    <SortHeader label="Qty Sold" colKey="totalQuantity" onClick={handleCatSort} activeKey={catSortKey} activeDir={catSortDir} />
                    <SortHeader label="Revenue" colKey="totalRevenue" onClick={handleCatSort} activeKey={catSortKey} activeDir={catSortDir} />
                    <SortHeader label="Avg Price" colKey="avgPrice" onClick={handleCatSort} activeKey={catSortKey} activeDir={catSortDir} />
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((cat, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-left font-medium text-primary"
                          onClick={() => { setSelectedCategory(cat); setCategoryModalOpen(true); }}
                        >
                          {cat.name}
                        </Button>
                      </td>
                      <td className="p-3 text-right">{cat.productCount}</td>
                      <td className="p-3 text-right">{cat.totalQuantity}</td>
                      <td className="p-3 text-right">{"\u20B9"}{Math.round(cat.totalRevenue).toLocaleString()}</td>
                      <td className="p-3 text-right">{"\u20B9"}{Math.round(cat.avgPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No category data available</div>
          )}
        </CardContent>
      </Card>

      {/* Product Variation Modal */}
      <ProductVariationModal
        product={selectedProduct}
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        allOrders={allOrders}
      />

      {/* Category Breakdown Modal */}
      <CategoryBreakdownModal
        category={selectedCategory}
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        allOrders={allOrders}
        productCategoryMap={productCategoryMap}
        onProductClick={(prod) => {
          setCategoryModalOpen(false);
          setSelectedProduct(prod);
          setProductModalOpen(true);
        }}
      />
    </div>
  );
};
