import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Search, PauseCircle, Play, Clock } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { bulkOrderMovementService } from '@/services/bulkOrderMovementService';
import { toast } from 'sonner';

const HoldPage = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [bulkReleasing, setBulkReleasing] = useState(false);

  const fetchHoldOrders = async () => {
    setLoading(true);
    try {
      const data = await wooCommerceOrderService.fetchOrdersByStage('hold');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching hold orders:', error);
      toast.error('Failed to fetch held orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(term) ||
      order.customer_name.toLowerCase().includes(term) ||
      (order.customer_email || '').toLowerCase().includes(term)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const releaseOrder = async (order: WooCommerceOrder) => {
    const targetStage = order.hold_previous_stage || 'processing';
    setReleasingId(order.id);
    try {
      await wooCommerceOrderService.updateOrderStage(
        order.id,
        targetStage as any
      );
      toast.success(`Order ${order.order_number} released to ${bulkOrderMovementService.getStageDisplayName(targetStage)}`);
      await fetchHoldOrders();
      selectedOrders.delete(order.id);
      setSelectedOrders(new Set(selectedOrders));
    } catch (error) {
      console.error('Error releasing order:', error);
      toast.error('Failed to release order');
    } finally {
      setReleasingId(null);
    }
  };

  const bulkRelease = async () => {
    if (selectedOrders.size === 0) return;
    setBulkReleasing(true);
    try {
      const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
      let successCount = 0;
      let failCount = 0;

      for (const order of selectedOrdersList) {
        const targetStage = order.hold_previous_stage || 'processing';
        try {
          await wooCommerceOrderService.updateOrderStage(order.id, targetStage as any);
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`Released ${successCount} orders from hold`);
      } else {
        toast.warning(`Released ${successCount} orders, ${failCount} failed`);
      }

      setSelectedOrders(new Set());
      await fetchHoldOrders();
    } catch (error) {
      console.error('Error bulk releasing orders:', error);
      toast.error('Failed to bulk release orders');
    } finally {
      setBulkReleasing(false);
    }
  };

  const getHoldDuration = (heldAt?: string): string => {
    if (!heldAt) return 'Unknown';
    const held = new Date(heldAt);
    const now = new Date();
    const diffMs = now.getTime() - held.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-poppins flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-red-500" />
              Orders On Hold
              <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedOrders.size > 0 && (
                <Button
                  onClick={bulkRelease}
                  disabled={bulkReleasing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {bulkReleasing ? 'Releasing...' : `Release ${selectedOrders.size} Selected`}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={fetchHoldOrders} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order number, customer name, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Loading held orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PauseCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No orders on hold</p>
              <p className="text-sm">Orders placed on hold from any stage will appear here.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Previous Stage</TableHead>
                    <TableHead>On Hold For</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.currency || 'INR'} {order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {bulkOrderMovementService.getStageDisplayName(order.hold_previous_stage || 'processing')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" />
                          <span className="text-sm">{getHoldDuration(order.held_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => releaseOrder(order)}
                          disabled={releasingId === order.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {releasingId === order.id ? 'Releasing...' : 'Release'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HoldPage;
