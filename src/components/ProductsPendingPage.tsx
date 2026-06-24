import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Printer, Search, ImageIcon, Package } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder, WooCommerceOrderItem } from '@/services/wooCommerceOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { resolveLineItemImage } from '@/utils/printingImageResolver';
import { supabase } from '@/integrations/supabase/client';

interface SizeQty {
  size: string;
  qty: number;
}

interface PendingProductGroup {
  key: string;
  name: string;
  color: string;
  image: string;
  totalQty: number;
  orderCount: number;
  orderNumbers: string[];
  sizes: SizeQty[];
}

const stripVariationFromName = (name: string, item: WooCommerceOrderItem) => {
  if (!name) return 'Product';
  const dashIdx = name.search(/\s+[-–—]\s+/);
  if (dashIdx === -1) return name.trim() || 'Product';
  const base = name.slice(0, dashIdx).trim();
  const tail = name.slice(dashIdx).replace(/^\s+[-–—]\s+/, '');
  const tokens = tail.split(/\s*[,/]\s*/).filter(Boolean);
  const variationValues = [item.color, item.size].filter(Boolean).map(v => v!.toLowerCase());
  const remaining = tokens.filter(t => !variationValues.includes(t.toLowerCase()));
  if (remaining.length === 0) return base || 'Product';
  return `${base} - ${remaining.join(', ')}`;
};

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

const buildPendingProducts = (orders: WooCommerceOrder[]): PendingProductGroup[] => {
  // One card per (product name + color). Sizes are aggregated inside each card.
  const map = new Map<string, PendingProductGroup & { sizeMap: Map<string, number> }>();
  const cleanOrders = dedupeAndFilterProcessing(orders);

  for (const order of cleanOrders) {
    for (const item of order.line_items || []) {
      const cleanName = stripVariationFromName(item.name || 'Product', item);
      const color = (item.color || '').trim();
      const size = (item.size || '').trim();
      const key = `${cleanName.toLowerCase()}||${color.toLowerCase()}`;
      const qty = Number(item.quantity) || 1;
      const sizeLabel = size || 'One Size';

      let existing = map.get(key);
      if (!existing) {
        existing = {
          key,
          name: cleanName,
          color,
          image: resolveLineItemImage(item),
          totalQty: 0,
          orderCount: 0,
          orderNumbers: [],
          sizes: [],
          sizeMap: new Map<string, number>(),
        };
        map.set(key, existing);
      }

      existing.totalQty += qty;
      existing.sizeMap.set(sizeLabel, (existing.sizeMap.get(sizeLabel) || 0) + qty);
      if (!existing.orderNumbers.includes(order.order_number)) {
        existing.orderNumbers.push(order.order_number);
        existing.orderCount = existing.orderNumbers.length;
      }
      if (!existing.image) {
        existing.image = resolveLineItemImage(item);
      }
    }
  }

  // Finalize: turn the size map into a qty-sorted array (highest first) and
  // sort the cards themselves by total qty (highest first).
  return Array.from(map.values())
    .map(({ sizeMap, ...group }) => ({
      ...group,
      sizes: Array.from(sizeMap.entries())
        .map(([size, qty]) => ({ size, qty }))
        .sort((a, b) => b.qty - a.qty),
    }))
    .sort((a, b) => b.totalQty - a.totalQty);
};

const colorSwatchStyle = (color: string): React.CSSProperties => {
  const lower = color.toLowerCase();
  const namedFallback: Record<string, string> = {
    onion: '#c8839a',
    'royal black': '#0a0a0a',
    black: '#111111',
    white: '#f5f5f5',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#facc15',
    pink: '#ec4899',
    orange: '#f97316',
    purple: '#7c3aed',
    grey: '#6b7280',
    gray: '#6b7280',
    beige: '#d8c4a0',
    cream: '#f5ebd6',
    maroon: '#7f1d1d',
    navy: '#1e3a8a',
    gold: '#d4af37',
    silver: '#c0c0c0',
  };
  const background = namedFallback[lower] || lower || '#e5e7eb';
  return { background };
};

const ProductsPendingPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'product' | 'qty'>('product');
  const { user } = useAuth();

  const fetchPending = useCallback(async () => {
    if (!user) return;
    try {
      const processingOrders = await wooCommerceOrderService.fetchOrdersByStage('processing');
      setOrders(processingOrders);
    } catch (error: any) {
      console.error('Error fetching pending products:', error);
      toast.error('Failed to fetch pending products');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await fetchPending();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, fetchPending]);

  // Auto-refresh whenever the orders table changes (move to packing, etc.)
  // and when the tab regains focus, so qty always reflects the latest state.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('products-pending-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => { fetchPending(); }
      )
      .subscribe();

    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchPending();
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', fetchPending);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', fetchPending);
    };
  }, [user, fetchPending]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchPending();
      toast.success('Pending products refreshed');
    } finally {
      setSyncing(false);
    }
  };

  const pendingProducts = useMemo(() => buildPendingProducts(orders), [orders]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return pendingProducts;
    const q = searchQuery.toLowerCase().trim();
    return pendingProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.color.toLowerCase().includes(q) ||
      p.sizes.some(s => s.size.toLowerCase().includes(q))
    );
  }, [pendingProducts, searchQuery]);

  const totalVariants = filteredProducts.length;
  const totalUnits = filteredProducts.reduce((sum, p) => sum + p.totalQty, 0);

  // Group variant cards by base product name so the user sees the per-product
  // total alongside the variant breakdown — this matches the Printing filter total.
  const productGroups = useMemo(() => {
    const groups = new Map<string, { name: string; totalQty: number; variants: PendingProductGroup[] }>();
    for (const p of filteredProducts) {
      const key = p.name.toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.totalQty += p.totalQty;
        existing.variants.push(p);
      } else {
        groups.set(key, { name: p.name, totalQty: p.totalQty, variants: [p] });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredProducts]);

  const handlePrint = () => {
    if (filteredProducts.length === 0) {
      toast.error('No pending products to print');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const renderPrintCard = (p: PendingProductGroup) => {
      const imgHtml = p.image
        ? `<img src="${p.image}" alt="" />`
        : `<div class="ph"></div>`;
      const colorHeading = p.color
        ? `<div class="color">COLOR - ${p.color}</div>`
        : '';
      const sizesHtml = p.sizes
        .map(s => `<tr><td>${s.size}</td><td>${s.qty}</td></tr>`)
        .join('');
      return `
        <div class="card">
          <div class="img">${imgHtml}</div>
          <div class="body">
            <div class="name">${p.name}</div>
            ${colorHeading}
            <table class="sizes">
              <thead><tr><th>Size</th><th>Qty</th></tr></thead>
              <tbody>${sizesHtml}</tbody>
            </table>
            <div class="meta">
              <div class="qty">Qty: <strong>${p.totalQty}</strong></div>
              <div class="orders">${p.orderCount} order${p.orderCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>`;
    };

    // Match the on-screen sort: grouped by product (with headings) or flat by qty.
    const bodyHtml = sortMode === 'product'
      ? productGroups.map(group => `
        <div class="group">
          <div class="group-head">
            <span class="group-name">${group.name}</span>
            <span class="group-total">Total: <strong>${group.totalQty}</strong> unit${group.totalQty !== 1 ? 's' : ''}</span>
          </div>
          <div class="grid">${group.variants.map(renderPrintCard).join('')}</div>
        </div>`).join('')
      : `<div class="grid">${filteredProducts.map(renderPrintCard).join('')}</div>`;

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Pending Products</title><meta charset="utf-8">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, sans-serif; margin: 0; color: #111; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #111; }
  .header h1 { margin: 0; font-size: 18px; }
  .header .sub { font-size: 11px; color: #555; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .group { margin-bottom: 14px; }
  .group-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #d1d5db; page-break-after: avoid; break-after: avoid; }
  .group-name { font-size: 14px; font-weight: 700; }
  .group-total { font-size: 11px; color: #555; }
  .card { border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: #fff; page-break-inside: avoid; display: flex; flex-direction: column; }
  .img { height: 110px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .img img { width: 100%; height: 100%; object-fit: contain; }
  .img .ph { width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 6px, #e5e7eb 6px, #e5e7eb 12px); }
  .body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .name { font-size: 12px; font-weight: 600; line-height: 1.3; min-height: 32px; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 6px; border-radius: 999px; background: #f3f4f6; border: 1px solid #e5e7eb; }
  .chip.size { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; font-weight: 600; }
  .color { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 13px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .color .dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); display: inline-block; }
  .sizes { width: 100%; border-collapse: collapse; font-size: 11px; }
  .sizes th, .sizes td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: left; }
  .sizes th { background: #eef2ff; color: #3730a3; font-weight: 600; }
  .sizes td:last-child, .sizes th:last-child { text-align: center; width: 40px; font-weight: 600; }
  .chip .dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); display: inline-block; }
  .meta { display: flex; justify-content: space-between; align-items: center; padding-top: 4px; border-top: 1px dashed #e5e7eb; }
  .qty { font-size: 11px; }
  .qty strong { font-size: 14px; color: #111; }
  .orders { font-size: 10px; color: #6b7280; }
</style></head>
<body>
  <div class="header">
    <div><h1>Pending Products</h1><div class="sub">Products from orders in Printing stage</div></div>
    <div class="sub">${totalVariants} variants &middot; ${totalUnits} units &middot; ${new Date().toLocaleString()}</div>
  </div>
  ${bodyHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body></html>`);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading pending products...</p>
        </div>
      </div>
    );
  }

  const renderCard = (p: PendingProductGroup) => (
    <div key={p.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <ImageIcon className="h-10 w-10 text-gray-300" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
          {p.name}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.color && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
              <span
                className="w-3 h-3 rounded-full border border-black/10"
                style={colorSwatchStyle(p.color)}
              />
              {p.color}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.sizes.map((s) => (
            <span
              key={s.size}
              className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold"
            >
              {s.size} - {s.qty}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-dashed border-gray-200">
          <div className="text-sm">
            Qty: <span className="text-xl font-bold text-gray-900">{p.totalQty}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {p.orderCount} order{p.orderCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Pending</h1>
          <p className="text-gray-600 mt-1">
            {totalVariants} variant{totalVariants !== 1 ? 's' : ''} &middot; {totalUnits} unit{totalUnits !== 1 ? 's' : ''} pending from printing stage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="h-4 w-4" />
            Print A4
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, color, or size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as 'product' | 'qty')}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Sort by product</SelectItem>
            <SelectItem value="qty">Sort by quantity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg border text-center py-16">
          <Package className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium mb-1">No pending products</h3>
          <p className="text-muted-foreground text-sm">
            {pendingProducts.length === 0
              ? 'There are no orders in the printing stage right now.'
              : 'No products match your search.'}
          </p>
        </div>
      ) : sortMode === 'product' ? (
        <div className="space-y-6">
          {productGroups.map((group) => (
            <div key={group.name}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-base font-semibold text-gray-900">{group.name}</h2>
                <div className="text-sm text-gray-600">
                  Total: <span className="font-bold text-gray-900">{group.totalQty}</span> unit{group.totalQty !== 1 ? 's' : ''}
                  <span className="text-gray-400"> &middot; {group.variants.length} variant{group.variants.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.variants.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(renderCard)}
        </div>
      )}
    </div>
  );
};

export default ProductsPendingPage;
