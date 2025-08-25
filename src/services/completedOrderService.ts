import { supabase } from '@/integrations/supabase/client';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';

export interface CompletedOrder {
  id: string;
  user_id: string;
  original_order_id: string;
  order_data: any;
  completed_at: string;
  created_at: string;
}

export const completedOrderService = {
  async storeCompletedOrder(order: WooCommerceOrder): Promise<CompletedOrder> {
    console.log(`📦 Storing completed order data for order ${order.order_number}`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if this order is already stored to avoid duplicates
    const existing = await this.getCompletedOrderByOriginalId(order.id);
    if (existing) {
      console.log(`⚠️ Order ${order.order_number} already exists in completed orders, updating...`);
      
      // Update existing completed order
      const { data, error } = await supabase
        .from('completed_orders')
        .update({
          order_data: this.createOrderSnapshot(order),
          completed_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating completed order:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Failed to update completed order - no data returned');
      }

      console.log(`✅ Successfully updated completed order: ${data.id}`);
      return data as CompletedOrder;
    }

    // Create new completed order
    const { data, error } = await supabase
      .from('completed_orders')
      .insert({
        user_id: user.id,
        original_order_id: order.id,
        order_data: this.createOrderSnapshot(order),
        completed_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error storing completed order:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to store completed order - no data returned');
    }

    console.log(`✅ Successfully stored completed order: ${data.id}`);
    return data as CompletedOrder;
  },

  createOrderSnapshot(order: WooCommerceOrder) {
    // Create a comprehensive snapshot of the order data
    return {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || null,
      reseller_name: order.reseller_name || null,
      reseller_number: order.reseller_number || null,
      shipping_address: order.shipping_address || null,
      total: order.total,
      items: order.items,
      line_items: order.line_items ? JSON.parse(JSON.stringify(order.line_items)) : [],
      status: order.status,
      tracking_number: order.tracking_number || null,
      carrier: order.carrier || null,
      created_at: order.created_at,
      printed_at: order.printed_at || null,
      packed_at: order.packed_at || null,
      shipped_at: order.shipped_at || null,
      delivered_at: order.delivered_at || null,
      stage: order.stage || order.status
    };
  },

  async getCompletedOrders(): Promise<CompletedOrder[]> {
    console.log('📖 Fetching completed orders...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('completed_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed orders:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} completed orders`);
    return (data || []) as CompletedOrder[];
  },

  async getCompletedOrderByOriginalId(originalOrderId: string): Promise<CompletedOrder | null> {
    console.log(`🔍 Fetching completed order by original ID: ${originalOrderId}`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('completed_orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('original_order_id', originalOrderId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching completed order:', error);
      throw error;
    }

    if (data) {
      console.log(`✅ Found completed order: ${data.id}`);
    } else {
      console.log(`ℹ️ No completed order found for original ID: ${originalOrderId}`);
    }

    return data as CompletedOrder | null;
  },

  async deleteCompletedOrder(id: string): Promise<void> {
    console.log(`🗑️ Deleting completed order: ${id}`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('completed_orders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting completed order:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted completed order: ${id}`);
  }
};
