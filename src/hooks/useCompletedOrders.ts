
import { useState, useEffect } from 'react';
import { completedOrderService, CompletedOrder } from '@/services/completedOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCompletedOrders = () => {
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCompletedOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const orders = await completedOrderService.getCompletedOrders();
      setCompletedOrders(orders);
    } catch (error: any) {
      console.error('Error fetching completed orders:', error);
      toast.error('Failed to load completed orders');
    } finally {
      setLoading(false);
    }
  };

  const storeCompletedOrder = async (order: any) => {
    try {
      const completedOrder = await completedOrderService.storeCompletedOrder(order);
      // Refresh the list
      await fetchCompletedOrders();
      toast.success('Order data stored for future reference');
      return completedOrder;
    } catch (error: any) {
      console.error('Error storing completed order:', error);
      toast.error('Failed to store order data');
      throw error;
    }
  };

  const getCompletedOrderByOriginalId = async (originalOrderId: string) => {
    try {
      return await completedOrderService.getCompletedOrderByOriginalId(originalOrderId);
    } catch (error: any) {
      console.error('Error fetching completed order:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompletedOrders();
    }
  }, [user]);

  return {
    completedOrders,
    loading,
    fetchCompletedOrders,
    storeCompletedOrder,
    getCompletedOrderByOriginalId,
    refetch: fetchCompletedOrders
  };
};
