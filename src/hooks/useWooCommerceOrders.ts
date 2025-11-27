
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';

// Load cached orders for instant display
const loadCachedOrders = (): WooCommerceOrder[] => {
  try {
    const cached = localStorage.getItem('orders_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheTime = parsed.timestamp || 0;
      const now = Date.now();
      // Use cache if less than 5 minutes old
      if (now - cacheTime < 5 * 60 * 1000) {
        console.log(`📦 Loading ${parsed.orders.length} cached orders for instant display`);
        return parsed.orders;
      }
    }
  } catch (error) {
    console.error('Error loading cached orders:', error);
  }
  return [];
};

export const useWooCommerceOrders = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>(loadCachedOrders());
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const syncAndLoadOrders = async () => {
    if (!user) {
      toast.error('Please log in to sync orders');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Starting WooCommerce sync and load process...');
      
      // First sync from WooCommerce to Supabase
      await wooCommerceOrderService.syncOrdersFromWooCommerce();
      
      // Then load from Supabase database
      const fetchedOrders = await wooCommerceOrderService.fetchOrders();
      setOrders(fetchedOrders);
      
      console.log(`✅ Successfully loaded ${fetchedOrders.length} orders`);
    } catch (error: any) {
      console.error('Error in sync and load:', error);
      toast.error(`Failed to sync orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersFromDatabase = async (silent: boolean = false) => {
    if (!user) return;

    if (!silent) setLoading(true);
    try {
      console.log('📖 Loading orders from database...');
      const fetchedOrders = await wooCommerceOrderService.fetchOrders();
      setOrders(fetchedOrders);
      
      // Cache orders for instant load next time
      try {
        localStorage.setItem('orders_cache', JSON.stringify({
          orders: fetchedOrders,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache orders:', e);
      }
      
      console.log(`✅ Loaded ${fetchedOrders.length} orders from database`);
    } catch (error: any) {
      console.error('Error loading orders from database:', error);
      if (!silent) toast.error('Failed to load orders from database');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) return false;

    try {
      console.log(`🔄 Updating order ${orderId} status to ${newStatus}`);
      
      // Update via service
      await wooCommerceOrderService.updateOrderStage(
        orderId, 
        newStatus as 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered'
      );
      
      // Fast silent refresh from database
      await loadOrdersFromDatabase(true);
      
      console.log(`✅ Order ${orderId} status successfully updated to ${newStatus}`);
      return true;
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
      return false;
    }
  };

  // Load orders on component mount and user change
  useEffect(() => {
    if (user) {
      // Fast silent refresh first (uses cache if available)
      loadOrdersFromDatabase(true);
    } else {
      setOrders([]);
    }
  }, [user]);

  return {
    orders,
    loading,
    fetchOrdersFromWooCommerce: syncAndLoadOrders, // This now syncs from WooCommerce first
    refetch: loadOrdersFromDatabase,
    updateOrderStatus
  };
};
