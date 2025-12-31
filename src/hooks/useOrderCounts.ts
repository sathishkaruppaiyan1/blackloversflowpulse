import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrderCounts {
  processing: number;
  packing: number;
  packed: number;
  shipped: number;
  delivered: number;
  total: number;
}

export const useOrderCounts = () => {
  const [counts, setCounts] = useState<OrderCounts>({
    processing: 0,
    packing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCounts = async () => {
    if (!user) {
      setCounts({ processing: 0, packing: 0, packed: 0, shipped: 0, delivered: 0, total: 0 });
      return;
    }

    try {
      // Fetch counts for each stage in parallel using count-only queries (no row limit)
      const [processingRes, packingRes, packedRes, shippedRes, deliveredRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'processing'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['packing', 'printed']),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'packed'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'shipped'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'delivered')
      ]);

      const newCounts = {
        processing: processingRes.count || 0,
        packing: packingRes.count || 0,
        packed: packedRes.count || 0,
        shipped: shippedRes.count || 0,
        delivered: deliveredRes.count || 0,
        total: (processingRes.count || 0) + (packingRes.count || 0) + (packedRes.count || 0) + (shippedRes.count || 0) + (deliveredRes.count || 0)
      };

      console.log('📊 Order counts from DB:', newCounts);
      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching order counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [user]);

  // Set up realtime subscription for count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('order-counts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch counts on any order change
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    counts,
    loading,
    refetch: fetchCounts
  };
};
