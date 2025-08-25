import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderStageMovement {
  id: string;
  user_id: string;
  order_id: string;
  from_stage?: string;
  to_stage: string;
  moved_at: string;
  notes?: string;
  moved_by_user_id?: string;
  created_at: string;
}

export const orderStageMovementService = {
  async recordStageMovement(
    orderId: string,
    fromStage: string | null,
    toStage: string,
    notes?: string
  ): Promise<OrderStageMovement> {
    console.log(`Recording stage movement for order ${orderId}: ${fromStage} → ${toStage}`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const movementData = {
      user_id: user.id,
      order_id: orderId,
      from_stage: fromStage,
      to_stage: toStage,
      notes: notes || null,
      moved_by_user_id: user.id
    };

    const { data, error } = await supabase
      .from('order_stage_movements')
      .insert(movementData)
      .select('*')
      .single();

    if (error) {
      console.error('Error recording stage movement:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to record stage movement - no data returned');
    }

    console.log(`Successfully recorded stage movement: ${data.id}`);
    return data as OrderStageMovement;
  },

  async getOrderStageHistory(orderId: string): Promise<OrderStageMovement[]> {
    console.log(`Fetching stage history for order ${orderId}`);

    const { data, error } = await supabase
      .from('order_stage_movements')
      .select('*')
      .eq('order_id', orderId)
      .order('moved_at', { ascending: true });

    if (error) {
      console.error('Error fetching stage history:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} stage movements for order ${orderId}`);
    return (data || []) as OrderStageMovement[];
  },

  async getRecentStageMovements(limit: number = 50): Promise<OrderStageMovement[]> {
    console.log(`Fetching recent stage movements (limit: ${limit})`);

    const { data, error } = await supabase
      .from('order_stage_movements')
      .select('*')
      .order('moved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent stage movements:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} recent stage movements`);
    return (data || []) as OrderStageMovement[];
  },

  async getStageMovementsByStage(stage: string): Promise<OrderStageMovement[]> {
    console.log(`Fetching stage movements for stage: ${stage}`);

    const { data, error } = await supabase
      .from('order_stage_movements')
      .select('*')
      .eq('to_stage', stage)
      .order('moved_at', { ascending: false });

    if (error) {
      console.error(`Error fetching movements for stage ${stage}:`, error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} movements for stage ${stage}`);
    return (data || []) as OrderStageMovement[];
  }
};
