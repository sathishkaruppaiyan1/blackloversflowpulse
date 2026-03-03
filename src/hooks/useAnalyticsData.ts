import { useMemo, useState, useEffect } from 'react';
import { useWooCommerceOrders } from '@/hooks/useWooCommerceOrders';
import { useCompletedOrders } from '@/hooks/useCompletedOrders';
import { WooCommerceOrder, WooCommerceOrderItem } from '@/services/wooCommerceOrderService';
import { CompletedOrder } from '@/services/completedOrderService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DateRangePreset = 'today' | '7days' | '30days' | '90days' | 'all';

export interface DateFilterParams {
  dateRange: DateRangePreset;
  customStartDate?: Date;
  customEndDate?: Date;
}

export interface VariationData {
  variationKey: string;
  quantitySold: number;
  revenue: number;
}

export interface ProductData {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  avgPrice: number;
  variations: VariationData[];
}

export interface TimeSeriesPoint {
  date: string;
  displayDate: string;
  value: number;
}

export interface StatusBreakdown {
  name: string;
  value: number;
  percentage: number;
}

export interface CarrierBreakdown {
  name: string;
  count: number;
}

export interface TopCustomer {
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
}

export interface OrderAnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  fulfillmentRate: number;
  revenueOverTime: TimeSeriesPoint[];
  ordersOverTime: TimeSeriesPoint[];
  ordersByStatus: StatusBreakdown[];
  ordersByCarrier: CarrierBreakdown[];
  topCustomers: TopCustomer[];
}

export interface CategoryData {
  name: string;
  productCount: number;
  totalQuantity: number;
  totalRevenue: number;
  avgPrice: number;
  products: ProductData[];
}

export interface ProductAnalyticsData {
  totalProductsSold: number;
  topProduct: string;
  mostPopularVariation: string;
  totalRevenue: number;
  revenueByProduct: { name: string; revenue: number }[];
  quantityByProduct: { name: string; quantity: number }[];
  productTable: ProductData[];
  categoryTable: CategoryData[];
}

// Normalize a completed order snapshot back into WooCommerceOrder shape
function normalizeCompletedOrder(co: CompletedOrder): WooCommerceOrder {
  const d = co.order_data as any;
  return {
    id: co.original_order_id,
    order_number: d.order_number ?? '',
    customer_name: d.customer_name ?? '',
    customer_email: d.customer_email ?? '',
    customer_phone: d.customer_phone,
    total: typeof d.total === 'number' ? d.total : parseFloat(d.total) || 0,
    status: d.status ?? 'completed',
    stage: d.stage ?? 'completed',
    items: d.items ?? 0,
    shipping_address: d.shipping_address,
    created_at: d.created_at ?? co.created_at,
    printed_at: d.printed_at,
    packed_at: d.packed_at,
    shipped_at: d.shipped_at,
    delivered_at: d.delivered_at,
    tracking_number: d.tracking_number,
    carrier: d.carrier,
    line_items: d.line_items ?? [],
  };
}

export function getVariationKey(item: WooCommerceOrderItem): string {
  const parts: string[] = [];
  if (item.color) parts.push(item.color);
  if (item.size) parts.push(item.size);
  if (parts.length > 0) return parts.join(' - ');

  // Try meta_data
  if (item.meta_data && item.meta_data.length > 0) {
    const metaParts = item.meta_data
      .filter(m => !m.key.startsWith('_') && !m.display_key.startsWith('_'))
      .map(m => `${m.display_key}: ${m.display_value}`)
      .filter(Boolean);
    if (metaParts.length > 0) return metaParts.join(', ');
  }

  return 'Standard';
}

function getDateRange(params: DateFilterParams): { start: Date | null; end: Date | null } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (params.dateRange) {
    case 'today':
      return { start: todayStart, end: now };
    case '7days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: now };
    }
    case '30days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: now };
    }
    case '90days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 89);
      return { start, end: now };
    }
    case 'all':
      return { start: null, end: null };
    default:
      return { start: null, end: null };
  }
}

function buildTimeSeries(orders: WooCommerceOrder[], start: Date, end: Date, getValue: (o: WooCommerceOrder) => number): TimeSeriesPoint[] {
  const map = new Map<string, number>();
  const current = new Date(start);
  while (current <= end) {
    map.set(current.toISOString().split('T')[0], 0);
    current.setDate(current.getDate() + 1);
  }

  for (const order of orders) {
    const dateStr = (order.order_date || order.created_at || '').split('T')[0];
    if (map.has(dateStr)) {
      map.set(dateStr, (map.get(dateStr) || 0) + getValue(order));
    }
  }

  return Array.from(map.entries()).map(([date, value]) => {
    const d = new Date(date + 'T00:00:00');
    return {
      date,
      displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value,
    };
  });
}

// Transform raw WooCommerce API order into WooCommerceOrder shape for analytics
function normalizeWooCommerceApiOrder(order: any): WooCommerceOrder {
  const lineItems = order.line_items?.map((item: any) => {
    const meta: any = {
      id: item.id,
      product_id: item.product_id,
      variation_id: item.variation_id || null,
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price || '0'),
      total: parseFloat(item.total || '0'),
      sku: item.sku || null,
      meta_data: item.meta_data || [],
    };
    if (item.meta_data && Array.isArray(item.meta_data)) {
      item.meta_data.forEach((metaItem: any) => {
        const key = metaItem.key.toLowerCase();
        const value = metaItem.value;
        if (key.includes('color') || key.includes('colour')) meta.color = value;
        else if (key.includes('size')) meta.size = value;
        else if (key.includes('brand')) meta.brand = value;
        else if (key.includes('material')) meta.material = value;
        else if (key.includes('weight')) meta.weight = value;
      });
    }
    return meta;
  }) || [];

  const firstName = (order.billing?.first_name || '').trim();
  const lastName = (order.billing?.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Customer';

  return {
    id: order.id?.toString() || '',
    order_number: order.number || order.id?.toString() || '',
    customer_name: fullName,
    customer_email: order.billing?.email || '',
    customer_phone: order.billing?.phone || null,
    total: parseFloat(order.total || '0'),
    status: order.status || 'processing',
    stage: order.status as any,
    items: order.line_items?.length || 0,
    shipping_address: [
      order.shipping?.address_1,
      order.shipping?.city,
      order.shipping?.state,
      order.shipping?.postcode,
      order.shipping?.country
    ].filter(Boolean).join(', ') || '',
    created_at: order.date_created || order.date_created_gmt || '',
    order_date: order.date_created || order.date_created_gmt || '',
    line_items: lineItems,
  };
}

export const useAnalyticsData = (params: DateFilterParams) => {
  const { orders: activeOrders, loading: activeLoading } = useWooCommerceOrders();
  const { completedOrders, loading: completedLoading } = useCompletedOrders();
  const { user } = useAuth();

  // Fetch ALL WooCommerce orders (processing + on-hold + completed) directly for analytics
  const [wooAnalyticsOrders, setWooAnalyticsOrders] = useState<WooCommerceOrder[]>([]);
  const [wooAnalyticsLoading, setWooAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchWooOrdersForAnalytics = async () => {
      setWooAnalyticsLoading(true);
      try {
        // Get WooCommerce settings
        const { data: settings } = await supabase
          .from('woocommerce_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings) {
          console.log('📊 Analytics: No WooCommerce settings found, using local orders only');
          setWooAnalyticsLoading(false);
          return;
        }

        // Fetch processing, on-hold, and completed orders by calling
        // the existing edge function once per status (avoids CORS/deployment issues)
        const statusesToFetch = ['processing', 'on-hold', 'completed'];
        const allWooOrders: any[] = [];

        for (const status of statusesToFetch) {
          console.log(`📊 Analytics: Fetching "${status}" orders...`);
          const { data, error } = await supabase.functions.invoke('fetch-woocommerce-orders', {
            body: {
              store_url: settings.store_url,
              consumer_key: settings.consumer_key,
              consumer_secret: settings.consumer_secret,
              status // pass single status
            }
          });

          if (error || data?.error) {
            console.error(`📊 Analytics: Error fetching "${status}" orders:`, error || data?.error);
            continue; // skip this status, try next
          }

          if (data?.orders?.length) {
            console.log(`📊 Analytics: Got ${data.orders.length} "${status}" orders`);
            allWooOrders.push(...data.orders);
          } else {
            console.log(`📊 Analytics: No "${status}" orders found`);
          }
        }

        if (!cancelled && allWooOrders.length > 0) {
          const normalized = allWooOrders.map(normalizeWooCommerceApiOrder);
          console.log(`📊 Analytics: Total ${normalized.length} orders from WooCommerce`);
          setWooAnalyticsOrders(normalized);
        }
      } catch (err) {
        console.error('📊 Analytics: Failed to fetch WooCommerce orders:', err);
      } finally {
        if (!cancelled) setWooAnalyticsLoading(false);
      }
    };

    fetchWooOrdersForAnalytics();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch product-to-category mapping from Supabase products table
  const [productCategoryMap, setProductCategoryMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('name, category')
        .eq('user_id', user.id);
      if (data) {
        const map = new Map<string, string>();
        for (const p of data) {
          map.set(p.name.toLowerCase(), p.category);
        }
        setProductCategoryMap(map);
      }
    };
    fetchProducts();
  }, [user]);

  const loading = activeLoading || completedLoading || wooAnalyticsLoading;

  // Merge and deduplicate orders from all sources:
  // 1. WooCommerce API orders (processing + on-hold + completed) for analytics
  // 2. Local DB active orders (processing, packing, packed, shipped, etc.)
  // 3. Completed orders archive
  const allOrders = useMemo(() => {
    console.log(`📊 Analytics merge: wooAnalytics=${wooAnalyticsOrders.length}, active=${activeOrders.length}, completed=${completedOrders.length}`);

    const orderMap = new Map<string, WooCommerceOrder>();

    // Add WooCommerce analytics orders first (broadest source)
    for (const order of wooAnalyticsOrders) {
      orderMap.set(order.order_number, order);
    }

    // Active local orders override WooCommerce data (they have local stage info)
    for (const order of activeOrders) {
      orderMap.set(order.order_number, order);
    }

    // Completed orders override (final state)
    for (const co of completedOrders) {
      const normalized = normalizeCompletedOrder(co);
      if (normalized.order_number) {
        orderMap.set(normalized.order_number, normalized);
      }
    }

    console.log(`📊 Analytics merge: Final deduplicated count = ${orderMap.size}`);
    return Array.from(orderMap.values());
  }, [activeOrders, completedOrders, wooAnalyticsOrders]);

  // Filter by date range
  const filteredOrders = useMemo(() => {
    const { start, end } = params.dateRange === 'all' && !params.customStartDate
      ? { start: null, end: null }
      : params.customStartDate && params.customEndDate
        ? { start: params.customStartDate, end: params.customEndDate }
        : getDateRange(params);

    if (!start && !end) return allOrders;

    return allOrders.filter(order => {
      const orderDate = new Date(order.order_date || order.created_at);
      if (start && orderDate < start) return false;
      if (end && orderDate > end) return false;
      return true;
    });
  }, [allOrders, params.dateRange, params.customStartDate, params.customEndDate]);

  // Compute order analytics
  const orderAnalytics = useMemo<OrderAnalyticsData>(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const fulfilledCount = filteredOrders.filter(o =>
      ['shipped', 'delivered', 'completed'].includes(o.stage)
    ).length;
    const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilledCount / totalOrders) * 100) : 0;

    // Time series
    const { start, end } = params.dateRange === 'all' && !params.customStartDate
      ? { start: null, end: null }
      : params.customStartDate && params.customEndDate
        ? { start: params.customStartDate, end: params.customEndDate }
        : getDateRange(params);

    const seriesStart = start ?? (filteredOrders.length > 0
      ? new Date(Math.min(...filteredOrders.map(o => new Date(o.order_date || o.created_at).getTime())))
      : new Date());
    const seriesEnd = end ?? new Date();

    const revenueOverTime = buildTimeSeries(filteredOrders, seriesStart, seriesEnd, o => o.total || 0);
    const ordersOverTime = buildTimeSeries(filteredOrders, seriesStart, seriesEnd, () => 1);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const o of filteredOrders) {
      const s = o.stage || o.status || 'unknown';
      statusMap[s] = (statusMap[s] || 0) + 1;
    }
    const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: totalOrders > 0 ? Math.round((value / totalOrders) * 100) : 0,
    }));

    // Carrier breakdown
    const carrierMap: Record<string, number> = {};
    for (const o of filteredOrders) {
      if (o.carrier) {
        carrierMap[o.carrier] = (carrierMap[o.carrier] || 0) + 1;
      }
    }
    const ordersByCarrier = Object.entries(carrierMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Top customers
    const customerMap = new Map<string, { name: string; email: string; orders: number; totalSpent: number }>();
    for (const o of filteredOrders) {
      const key = o.customer_email || o.customer_name;
      if (!key) continue;
      const existing = customerMap.get(key) || { name: o.customer_name, email: o.customer_email, orders: 0, totalSpent: 0 };
      existing.orders += 1;
      existing.totalSpent += o.total || 0;
      customerMap.set(key, existing);
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      fulfillmentRate,
      revenueOverTime,
      ordersOverTime,
      ordersByStatus,
      ordersByCarrier,
      topCustomers,
    };
  }, [filteredOrders, params.dateRange, params.customStartDate, params.customEndDate]);

  // Compute product analytics
  const productAnalytics = useMemo<ProductAnalyticsData>(() => {
    const productMap = new Map<string, ProductData>();

    for (const order of filteredOrders) {
      const lineItems = order.line_items || [];
      for (const item of lineItems) {
        const name = item.name || 'Unknown Product';
        const qty = item.quantity || 1;
        const revenue = parseFloat(item.total) || 0;
        const variationKey = getVariationKey(item);

        const existing = productMap.get(name) || {
          name,
          totalQuantity: 0,
          totalRevenue: 0,
          avgPrice: 0,
          variations: [],
        };

        existing.totalQuantity += qty;
        existing.totalRevenue += revenue;

        // Update variation
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

    // Compute avg prices
    const productTable = Array.from(productMap.values()).map(p => ({
      ...p,
      avgPrice: p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0,
    }));

    const totalProductsSold = productTable.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalRevenue = productTable.reduce((sum, p) => sum + p.totalRevenue, 0);

    // Top product by quantity
    const sortedByQty = [...productTable].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const topProduct = sortedByQty[0]?.name ?? 'N/A';

    // Most popular variation across all products
    const allVariations: { key: string; qty: number }[] = [];
    for (const p of productTable) {
      for (const v of p.variations) {
        allVariations.push({ key: `${p.name} - ${v.variationKey}`, qty: v.quantitySold });
      }
    }
    allVariations.sort((a, b) => b.qty - a.qty);
    const mostPopularVariation = allVariations[0]?.key ?? 'N/A';

    const revenueByProduct = [...productTable]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 15)
      .map(p => ({ name: p.name.length > 30 ? p.name.slice(0, 27) + '...' : p.name, revenue: Math.round(p.totalRevenue) }));

    const quantityByProduct = [...productTable]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 15)
      .map(p => ({ name: p.name.length > 30 ? p.name.slice(0, 27) + '...' : p.name, quantity: p.totalQuantity }));

    // Category breakdown — group products by category
    const categoryMap = new Map<string, CategoryData>();
    for (const prod of productTable) {
      const catName = productCategoryMap.get(prod.name.toLowerCase()) || 'Uncategorized';
      const existing = categoryMap.get(catName) || {
        name: catName,
        productCount: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        avgPrice: 0,
        products: [],
      };
      existing.productCount += 1;
      existing.totalQuantity += prod.totalQuantity;
      existing.totalRevenue += prod.totalRevenue;
      existing.products.push(prod);
      categoryMap.set(catName, existing);
    }
    const categoryTable = Array.from(categoryMap.values())
      .map(c => ({ ...c, avgPrice: c.totalQuantity > 0 ? c.totalRevenue / c.totalQuantity : 0 }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      totalProductsSold,
      topProduct,
      mostPopularVariation,
      totalRevenue,
      revenueByProduct,
      quantityByProduct,
      productTable: sortedByQty,
      categoryTable,
    };
  }, [filteredOrders, productCategoryMap]);

  return {
    loading,
    allOrders,
    filteredOrders,
    orderAnalytics,
    productAnalytics,
    productCategoryMap,
  };
};
