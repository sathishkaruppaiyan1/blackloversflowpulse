
import { useState, useEffect } from 'react';
import { orderStageMovementService, OrderStageMovement } from '@/services/orderStageMovementService';
import { toast } from 'sonner';

export const useOrderStageMovements = (orderId?: string) => {
  const [movements, setMovements] = useState<OrderStageMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrderHistory = async (orderIdToFetch: string) => {
    setLoading(true);
    try {
      const history = await orderStageMovementService.getOrderStageHistory(orderIdToFetch);
      setMovements(history);
    } catch (error: any) {
      console.error('Error fetching order stage history:', error);
      toast.error('Failed to load order stage history');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMovements = async (limit: number = 50) => {
    setLoading(true);
    try {
      const recent = await orderStageMovementService.getRecentStageMovements(limit);
      setMovements(recent);
    } catch (error: any) {
      console.error('Error fetching recent movements:', error);
      toast.error('Failed to load recent stage movements');
    } finally {
      setLoading(false);
    }
  };

  const recordMovement = async (
    orderIdForMovement: string,
    fromStage: string | null,
    toStage: string,
    notes?: string
  ) => {
    try {
      await orderStageMovementService.recordStageMovement(
        orderIdForMovement,
        fromStage,
        toStage,
        notes
      );
      
      // Refresh the movements if we're tracking this specific order
      if (orderId === orderIdForMovement) {
        await fetchOrderHistory(orderIdForMovement);
      }
      
      toast.success(`Stage movement recorded: ${toStage}`);
    } catch (error: any) {
      console.error('Error recording stage movement:', error);
      toast.error('Failed to record stage movement');
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderHistory(orderId);
    }
  }, [orderId]);

  return {
    movements,
    loading,
    fetchOrderHistory,
    fetchRecentMovements,
    recordMovement,
    refetch: orderId ? () => fetchOrderHistory(orderId) : () => {}
  };
};
