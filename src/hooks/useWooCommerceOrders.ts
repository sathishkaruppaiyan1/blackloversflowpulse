
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';

export const useWooCommerceOrders = () => {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
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

  const loadOrdersFromDatabase = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('📖 Loading orders from database...');
      const fetchedOrders = await wooCommerceOrderService.fetchOrders();
      setOrders(fetchedOrders);
      console.log(`✅ Loaded ${fetchedOrders.length} orders from database`);
    } catch (error: any) {
      console.error('Error loading orders from database:', error);
      toast.error('Failed to load orders from database');
    } finally {
      setLoading(false);
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
      
      // Refresh orders from database to ensure consistency
      await loadOrdersFromDatabase();
      
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
      loadOrdersFromDatabase();
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
