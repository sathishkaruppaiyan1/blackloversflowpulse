import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyOperationStats {
  date: string;
  displayDate: string;
  printed: number;
  packed: number;
  shipped: number;
}

export interface OperationsSummary {
  todayPrinted: number;
  todayPacked: number;
  todayShipped: number;
  weekPrinted: number;
  weekPacked: number;
  weekShipped: number;
}

export const useDailyOperationsReport = (days: number = 7) => {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyOperationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDailyStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        // Fetch all orders with timestamps
        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select('printed_at, packed_at, shipped_at')
          .eq('user_id', user.id)
          .or(`printed_at.gte.${startDate.toISOString()},packed_at.gte.${startDate.toISOString()},shipped_at.gte.${startDate.toISOString()}`);

        if (fetchError) {
          throw fetchError;
        }

        // Initialize daily stats
        const statsMap = new Map<string, DailyOperationStats>();
        
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - i));
          const dateStr = date.toISOString().split('T')[0];
          const displayDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          
          statsMap.set(dateStr, {
            date: dateStr,
            displayDate,
            printed: 0,
            packed: 0,
            shipped: 0
          });
        }

        // Count operations per day
        orders?.forEach(order => {
          if (order.printed_at) {
            const dateStr = new Date(order.printed_at).toISOString().split('T')[0];
            const stats = statsMap.get(dateStr);
            if (stats) {
              stats.printed++;
            }
          }
          
          if (order.packed_at) {
            const dateStr = new Date(order.packed_at).toISOString().split('T')[0];
            const stats = statsMap.get(dateStr);
            if (stats) {
              stats.packed++;
            }
          }
          
          if (order.shipped_at) {
            const dateStr = new Date(order.shipped_at).toISOString().split('T')[0];
            const stats = statsMap.get(dateStr);
            if (stats) {
              stats.shipped++;
            }
          }
        });

        setDailyStats(Array.from(statsMap.values()));
        setError(null);
      } catch (err: any) {
        console.error('Error fetching daily operations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyStats();
  }, [user, days]);

  const summary = useMemo<OperationsSummary>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats.find(s => s.date === todayStr);
    
    const weekTotals = dailyStats.reduce(
      (acc, day) => ({
        printed: acc.printed + day.printed,
        packed: acc.packed + day.packed,
        shipped: acc.shipped + day.shipped
      }),
      { printed: 0, packed: 0, shipped: 0 }
    );

    return {
      todayPrinted: todayStats?.printed || 0,
      todayPacked: todayStats?.packed || 0,
      todayShipped: todayStats?.shipped || 0,
      weekPrinted: weekTotals.printed,
      weekPacked: weekTotals.packed,
      weekShipped: weekTotals.shipped
    };
  }, [dailyStats]);

  return {
    dailyStats,
    summary,
    loading,
    error
  };
};
