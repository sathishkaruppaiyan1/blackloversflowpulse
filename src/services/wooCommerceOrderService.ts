
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { orderStageMovementService } from './orderStageMovementService';
import { wooCommerceApiService } from './wooCommerceApiService';
import { completedOrderService } from './completedOrderService';

export interface WooCommerceOrderItem {
  id: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  price: string;
  total: string;
  sku?: string;
  color?: string;
  size?: string;
  brand?: string;
  material?: string;
  weight?: string;
  dimensions?: string;
  packed?: boolean;
  meta_data?: Array<{
    id: number;
    key: string;
    value: string;
    display_key: string;
    display_value: string;
  }>;
}

export interface WooCommerceOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total: number;
  status: string;
  stage: 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'completed';
  items: number;
  shipping_address?: string;
  created_at: string;
  printed_at?: string;
  packed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_number?: string;
  carrier?: string;
  reseller_name?: string;
  reseller_number?: string;
  product_name?: string;
  product_variation?: string;
  line_items?: WooCommerceOrderItem[];
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_country?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postcode?: string;
  shipping_country?: string;
  order_date?: string;
  payment_method?: string;
  currency?: string;
}

const transformDatabaseOrder = (dbOrder: any): WooCommerceOrder => {
  // Extract product name and variation from line_items
  let productName = 'Product';
  let productVariation = 'Standard';
  
  if (Array.isArray(dbOrder.line_items) && dbOrder.line_items.length > 0) {
    const firstItem = dbOrder.line_items[0];
    productName = firstItem.name || 'Product';
    
    // Try to extract variation from color, size, or meta_data
    const variations = [];
    if (firstItem.color) variations.push(firstItem.color);
    if (firstItem.size) variations.push(firstItem.size);
    
    if (variations.length > 0) {
      productVariation = variations.join(' - ');
    }
  }

  return {
    id: dbOrder.id,
    order_number: dbOrder.order_number,
    customer_name: dbOrder.customer_name,
    customer_email: dbOrder.customer_email,
    customer_phone: dbOrder.customer_phone,
    total: parseFloat(dbOrder.total?.toString() || '0'),
    status: dbOrder.status,
    stage: dbOrder.status as 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'completed',
    items: dbOrder.items || 0,
    shipping_address: dbOrder.shipping_address,
    created_at: dbOrder.created_at,
    printed_at: dbOrder.printed_at,
    packed_at: dbOrder.packed_at,
    shipped_at: dbOrder.shipped_at,
    delivered_at: dbOrder.delivered_at,
    tracking_number: dbOrder.tracking_number,
    carrier: dbOrder.carrier,
    reseller_name: dbOrder.reseller_name,
    reseller_number: dbOrder.reseller_number,
    product_name: productName,
    product_variation: productVariation,
    line_items: Array.isArray(dbOrder.line_items) ? (dbOrder.line_items as unknown as WooCommerceOrderItem[]) : [],
    billing_address: dbOrder.billing_address,
    billing_city: dbOrder.billing_city,
    billing_state: dbOrder.billing_state,
    billing_postcode: dbOrder.billing_postcode,
    billing_country: dbOrder.billing_country,
    shipping_city: dbOrder.shipping_city,
    shipping_state: dbOrder.shipping_state,
    shipping_postcode: dbOrder.shipping_postcode,
    shipping_country: dbOrder.shipping_country,
    order_date: dbOrder.order_date,
    payment_method: dbOrder.payment_method,
    currency: dbOrder.currency || 'INR'
  };
};

export const wooCommerceOrderService = {
  async syncOrdersFromWooCommerce(): Promise<string[]> {
    console.log('🔄 Starting WooCommerce order sync...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get WooCommerce settings
    const { data: settings, error: settingsError } = await supabase
      .from('woocommerce_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('WooCommerce settings not found:', settingsError);
      throw new Error('WooCommerce settings not configured');
    }

    // Fetch orders from WooCommerce
    const { data, error } = await supabase.functions.invoke('fetch-woocommerce-orders', {
      body: {
        store_url: settings.store_url,
        consumer_key: settings.consumer_key,
        consumer_secret: settings.consumer_secret
      }
    });

    if (error || data?.error) {
      console.error('Error fetching from WooCommerce:', error || data?.error);
      throw new Error(data?.error || 'Failed to fetch orders from WooCommerce');
    }

    if (data?.orders && data.orders.length > 0) {
      // First, fetch existing orders to preserve their status if they've moved beyond 'processing'
      const wooOrderIds = data.orders.map((order: any) => order.id.toString());
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('woo_order_id, status')
        .eq('user_id', user.id)
        .in('woo_order_id', wooOrderIds);

      // Create a map of existing order statuses
      const existingStatusMap = new Map<string, string>();
      if (existingOrders) {
        existingOrders.forEach((existingOrder: any) => {
          existingStatusMap.set(existingOrder.woo_order_id, existingOrder.status);
        });
      }

      const ordersToSync = data.orders.map((order: any) => {
        const wooOrderId = order.id.toString();
        const existingStatus = existingStatusMap.get(wooOrderId);
        
        // Preserve local status if order has moved beyond 'processing'
        // Only set to 'processing' if it's a new order or still in 'processing' locally
        let orderStatus = 'processing';
        if (existingStatus) {
          // If order exists and has been moved beyond 'processing', preserve the local status
          if (existingStatus !== 'processing') {
            orderStatus = existingStatus;
            console.log(`Preserving local status '${existingStatus}' for order ${wooOrderId} (WooCommerce status: ${order.status})`);
          } else {
            // Order is still in 'processing', sync from WooCommerce
            orderStatus = order.status === 'processing' ? 'processing' : order.status;
          }
        } else {
          // New order, set status from WooCommerce
          orderStatus = order.status === 'processing' ? 'processing' : order.status;
        }

        // Extract product meta data from line_items
        const productMeta = order.line_items?.map((item: any) => {
          const meta: any = {
            id: item.id,
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price || '0'),
            total: parseFloat(item.total || '0'),
            sku: item.sku || null,
            meta_data: item.meta_data || [],
            packed: false
          };

          // Extract color, size, and other meta data
          if (item.meta_data && Array.isArray(item.meta_data)) {
            item.meta_data.forEach((metaItem: any) => {
              const key = metaItem.key.toLowerCase();
              const value = metaItem.value;
              
              if (key.includes('color') || key.includes('colour')) {
                meta.color = value;
              } else if (key.includes('size')) {
                meta.size = value;
              } else if (key.includes('brand')) {
                meta.brand = value;
              } else if (key.includes('material')) {
                meta.material = value;
              } else if (key.includes('weight')) {
                meta.weight = value;
              } else if (key.includes('dimension')) {
                meta.dimensions = value;
              }
            });
          }

          return meta;
        }) || [];

        // Extract reseller information
        let resellerName = null;
        let resellerNumber = null;

        if (order.meta_data && Array.isArray(order.meta_data)) {
          const resellerNameMeta = order.meta_data.find((meta: any) => 
            meta.key === 'billing_resllername'
          );
          
          const resellerNumberMeta = order.meta_data.find((meta: any) => 
            meta.key === 'billing_resellernumber'
          );

          resellerName = resellerNameMeta?.value || null;
          resellerNumber = resellerNumberMeta?.value || null;
        }

        // Format addresses with complete details
        let billingAddress = null;
        let shippingAddress = null;

        // Process billing address
        if (order.billing) {
          const addressParts = [];
          
          if (order.billing.first_name) {
            addressParts.push(order.billing.first_name.trim());
          }
          
          if (order.billing.company) {
            addressParts.push(order.billing.company);
          }
          
          if (order.billing.address_1) {
            addressParts.push(order.billing.address_1);
          }
          
          const locationParts = [];
          if (order.billing.city) locationParts.push(order.billing.city);
          if (order.billing.state) locationParts.push(order.billing.state);
          if (order.billing.postcode) locationParts.push(order.billing.postcode);
          
          if (locationParts.length > 0) {
            addressParts.push(locationParts.join(', '));
          }
          
          if (order.billing.country) {
            addressParts.push(order.billing.country);
          }
          
          billingAddress = addressParts.filter(part => part && part.trim()).join(', ');
        }

        // Process shipping address
        if (order.shipping) {
          const addressParts = [];
          
          if (order.shipping.first_name) {
            addressParts.push(order.shipping.first_name.trim());
          }
          
          if (order.shipping.company) {
            addressParts.push(order.shipping.company);
          }
          
          if (order.shipping.address_1) {
            addressParts.push(order.shipping.address_1);
          }
          
          const locationParts = [];
          if (order.shipping.city) locationParts.push(order.shipping.city);
          if (order.shipping.state) locationParts.push(order.shipping.state);
          if (order.shipping.postcode) locationParts.push(order.shipping.postcode);
          
          if (locationParts.length > 0) {
            addressParts.push(locationParts.join(', '));
          }
          
          if (order.shipping.country) {
            addressParts.push(order.shipping.country);
          }
          
          shippingAddress = addressParts.filter(part => part && part.trim()).join(', ');
        }

        // Use billing address as fallback if shipping is not available
        const finalShippingAddress = shippingAddress || billingAddress || 'Address not available';

        // Combine first name and last name for customer_name
        const firstName = (order.billing?.first_name || '').trim();
        const lastName = (order.billing?.last_name || '').trim();
        
        // Debug logging to verify we're getting both names
        if (order.number) {
          console.log(`📝 Order ${order.number}: firstName="${firstName}", lastName="${lastName}"`);
        }
        
        // Combine names - handle cases where one or both might be empty
        let fullName = '';
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`;
        } else if (firstName) {
          fullName = firstName;
        } else if (lastName) {
          fullName = lastName;
        } else {
          fullName = 'Unknown Customer';
        }
        
        console.log(`✅ Order ${order.number}: Full name set to "${fullName}"`);

        return {
          user_id: user.id,
          woo_order_id: wooOrderId,
          order_number: order.number || order.id.toString(),
          customer_name: fullName,
          customer_email: order.billing?.email || 'No email provided',
          customer_phone: order.billing?.phone || null,
          total: parseFloat(order.total || '0'),
          status: orderStatus, // Use preserved or synced status
          items: order.line_items?.length || 0,
          shipping_address: finalShippingAddress,
          line_items: productMeta,
          reseller_name: resellerName,
          reseller_number: resellerNumber,
          billing_address: billingAddress,
          billing_city: order.billing?.city || null,
          billing_state: order.billing?.state || null,
          billing_postcode: order.billing?.postcode || null,
          billing_country: order.billing?.country || null,
          shipping_city: order.shipping?.city || null,
          shipping_state: order.shipping?.state || null,
          shipping_postcode: order.shipping?.postcode || null,
          shipping_country: order.shipping?.country || null,
          order_date: order.date_created || order.date_created_gmt,
          payment_method: order.payment_method_title || order.payment_method || null,
          currency: order.currency || 'INR'
        };
      });

      // Upsert orders to database
      const { error: insertError } = await supabase
        .from('orders')
        .upsert(ordersToSync, { 
          onConflict: 'user_id,woo_order_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error syncing orders to database:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully synced ${ordersToSync.length} orders from WooCommerce`);
      
      // Now check existing orders in Supabase that are "processing" and verify their WooCommerce status
      // This ensures that if an order's status changed in WooCommerce, it's updated in Supabase
      await this.syncExistingProcessingOrders(settings, user.id);
      
      toast.success(`Synced ${ordersToSync.length} orders from WooCommerce`);
      return ordersToSync.map((o: any) => o.woo_order_id as string);
    }

    // Even if no new processing orders, still check existing ones
    if (user && settings) {
      await this.syncExistingProcessingOrders(settings, user.id);
    }

    return [];
  },

  async syncExistingProcessingOrders(settings: any, userId: string): Promise<void> {
    console.log('🔄 Checking existing processing orders for status changes...');
    
    // Get all orders in Supabase that are currently "processing"
    const { data: existingProcessingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, woo_order_id, order_number, status')
      .eq('user_id', userId)
      .eq('status', 'processing');
    
    if (fetchError || !existingProcessingOrders || existingProcessingOrders.length === 0) {
      console.log('No existing processing orders to check');
      return;
    }
    
    console.log(`📋 Checking ${existingProcessingOrders.length} existing processing orders...`);
    
    let updatedCount = 0;
    const batchSize = 10; // Process in batches to avoid overwhelming the API
    
    for (let i = 0; i < existingProcessingOrders.length; i += batchSize) {
      const batch = existingProcessingOrders.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (order: any) => {
        try {
          // Fetch current status from WooCommerce
          const { data, error } = await supabase.functions.invoke('fetch-woocommerce-orders', {
            body: {
              store_url: settings.store_url,
              consumer_key: settings.consumer_key,
              consumer_secret: settings.consumer_secret,
              order_id: order.woo_order_id
            }
          });
          
          if (error || data?.error || !data?.order) {
            console.log(`⚠️ Could not fetch WooCommerce status for order ${order.woo_order_id}:`, error || data?.error);
            return;
          }
          
          const wooOrder = data.order;
          const wooStatus = wooOrder.status;
          
          // Map WooCommerce status to our status
          // If WooCommerce status is no longer "processing", update Supabase
          if (wooStatus !== 'processing') {
            let newStatus = 'processing';
            
            // Map WooCommerce statuses to our statuses
            if (wooStatus === 'completed' || wooStatus === 'delivered') {
              newStatus = 'completed';
            } else if (wooStatus === 'cancelled' || wooStatus === 'refunded' || wooStatus === 'failed') {
              newStatus = 'completed'; // Treat cancelled/refunded as completed for our purposes
            } else if (wooStatus === 'on-hold') {
              newStatus = 'processing'; // Keep as processing
            } else {
              // For other statuses, keep as processing but log
              console.log(`Order ${order.order_number} has WooCommerce status "${wooStatus}", keeping as processing`);
              return;
            }
            
            // Update order status in Supabase
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: newStatus })
              .eq('id', order.id);
            
            if (updateError) {
              console.error(`Error updating order ${order.order_number}:`, updateError);
            } else {
              console.log(`✅ Updated order ${order.order_number} from "processing" to "${newStatus}" (WooCommerce status: ${wooStatus})`);
              updatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error checking order ${order.order_number}:`, error);
        }
      }));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < existingProcessingOrders.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (updatedCount > 0) {
      console.log(`✅ Updated ${updatedCount} orders that changed status in WooCommerce`);
      toast.success(`Updated ${updatedCount} orders with status changes from WooCommerce`);
    } else {
      console.log('✅ All processing orders still match WooCommerce status');
    }
  },

  async fetchOrders(): Promise<WooCommerceOrder[]> {
    console.log('Fetching orders from database...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('order_number', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} orders for user ${user.id}`);
    
    // Transform and sort by order number numerically (descending)
    const orders = (data || []).map(transformDatabaseOrder);
    
    // Sort by order number numerically (descending - highest first)
    orders.sort((a, b) => {
      const numA = parseInt(a.order_number) || 0;
      const numB = parseInt(b.order_number) || 0;
      return numB - numA; // Descending order
    });
    
    return orders;
  },

  async fetchOrdersByStage(stage: 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'completed'): Promise<WooCommerceOrder[]> {
    console.log(`Fetching orders for stage: ${stage}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Define status conditions based on stage
    let statusConditions: string[] = [stage];
    if (stage === 'packing') {
      // Packing stage includes both 'packing' and 'printed' statuses
      statusConditions = ['packing', 'printed'];
    } else if (stage === 'shipped') {
      // Shipped stage includes shipped, delivered, and completed orders
      statusConditions = ['shipped', 'delivered', 'completed'];
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', statusConditions)
      .order('order_number', { ascending: false });

    if (error) {
      console.error(`Error fetching orders for stage ${stage}:`, error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} orders for stage ${stage} for user ${user.id}`);
    
    // Transform and sort by order number numerically (descending)
    const orders = (data || []).map(transformDatabaseOrder);
    
    // Sort by order number numerically (descending - highest first)
    orders.sort((a, b) => {
      const numA = parseInt(a.order_number) || 0;
      const numB = parseInt(b.order_number) || 0;
      return numB - numA; // Descending order
    });
    
    return orders;
  },

  async updateOrderStage(orderId: string, stage: 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered'): Promise<WooCommerceOrder> {
    console.log(`🔄 Updating order ${orderId} to stage ${stage}`);
    
    // Get current order to know previous stage
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, user_id, woo_order_id')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching current order:', fetchError);
      throw fetchError;
    }

    const previousStage = currentOrder.status;
    const updateData: any = { status: stage };
    
    // Add timestamp fields based on stage
    const now = new Date().toISOString();
    switch (stage) {
      case 'packing':
        // Moving to packing means printing is done
        updateData.printed_at = now;
        console.log(`📝 Setting printed_at for order ${orderId} to ${now}`);
        break;
      case 'packed':
        // If going directly to packed (bypass packing), still set printed_at
        updateData.printed_at = now;
        updateData.packed_at = now;
        console.log(`📝 Setting printed_at AND packed_at for order ${orderId} to ${now} (bypass packing)`);
        break;
      case 'shipped':
        updateData.shipped_at = now;
        break;
      case 'delivered':
        updateData.delivered_at = now;
        break;
    }

    // Log what we're updating
    if (updateData.printed_at) {
      console.log(`🖨️ Updating order ${orderId} with printed_at: ${updateData.printed_at}`);
    }

    // Update in database
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();
    
    // Verify printed_at was set
    if (updateData.printed_at && data) {
      console.log(`✅ Order ${orderId} updated. printed_at in response: ${data.printed_at || 'MISSING!'}`);
      if (!data.printed_at) {
        console.error(`❌ WARNING: printed_at was not set for order ${orderId} even though we tried to set it!`);
      }
    }

    if (error) {
      console.error('Error updating order stage:', error);
      throw error;
    }

    // Store order in completed_orders when it reaches shipped or delivered stage
    if (stage === 'shipped' || stage === 'delivered') {
      try {
        const orderToStore = transformDatabaseOrder(data);
        await completedOrderService.storeCompletedOrder(orderToStore);
        console.log(`✅ Order ${orderId} stored in completed orders table`);
      } catch (completedOrderError) {
        console.error('Failed to store completed order:', completedOrderError);
        // Don't fail the main operation, just log the error
      }
    }

    // Update WooCommerce order status if needed, but don't change local status
    if (currentOrder.woo_order_id && currentOrder.user_id && (stage === 'shipped' || stage === 'delivered')) {
      try {
        await wooCommerceApiService.updateOrderStatus(
          currentOrder.woo_order_id,
          'completed',
          undefined,
          undefined,
          currentOrder.user_id
        );
        console.log('✅ WooCommerce order marked as completed, but local status remains as shipped/delivered');
      } catch (wooError) {
        console.error('Failed to update WooCommerce order status:', wooError);
        toast.error('Order updated locally, but failed to sync with WooCommerce');
      }
    }

    // Record stage movement
    try {
      await orderStageMovementService.recordStageMovement(
        orderId,
        previousStage,
        stage,
        `Order moved from ${previousStage} to ${stage}`
      );
    } catch (movementError) {
      console.error('Error recording stage movement:', movementError);
    }

    console.log(`✅ Successfully updated order ${orderId} to stage ${stage}`);
    toast.success(`Order moved to ${stage} stage`);
    return transformDatabaseOrder(data);
  },

  async updateOrderItemPacked(orderId: string, itemId: string, packed: boolean): Promise<void> {
    console.log(`Updating order item ${itemId} packed status to ${packed}`);
    
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('line_items')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order for item update:', fetchError);
      throw fetchError;
    }

    const lineItems = Array.isArray(order.line_items) ? (order.line_items as unknown as WooCommerceOrderItem[]) : [];
    const updatedLineItems = lineItems.map((item: WooCommerceOrderItem) => 
      item.id.toString() === itemId.toString() 
        ? { ...item, packed } 
        : item
    );

    const { error } = await supabase
      .from('orders')
      .update({ line_items: updatedLineItems as unknown as any })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order item packed status:', error);
      throw error;
    }

    console.log(`Successfully updated order item ${itemId} packed status`);
    toast.success(`Product ${packed ? 'packed' : 'unpacked'} successfully`);
  },

  async updateTracking(orderId: string, trackingNumber: string, carrier: string): Promise<WooCommerceOrder> {
    console.log(`🚀 Starting tracking update for order ${orderId}: ${trackingNumber} via ${carrier}`);
    
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, user_id, woo_order_id')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching current order for tracking:', fetchError);
      throw fetchError;
    }

    const previousStage = currentOrder.status;
    
    const updateData: any = {
      status: 'shipped', // Keep local status as shipped, not completed
      tracking_number: trackingNumber,
      carrier: carrier,
      shipped_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error updating tracking in database:', error);
      throw error;
    }

    // Store order in completed_orders since it's now shipped
    try {
      const orderToStore = transformDatabaseOrder(data);
      await completedOrderService.storeCompletedOrder(orderToStore);
      console.log(`✅ Order ${orderId} stored in completed orders table with tracking`);
    } catch (completedOrderError) {
      console.error('Failed to store completed order with tracking:', completedOrderError);
      // Don't fail the main operation, just log the error
    }

    // Update WooCommerce order status and shipment tracking (this will set WooCommerce to completed)
    if (currentOrder.woo_order_id && currentOrder.user_id) {
      try {
        // First update the order status to completed in WooCommerce
        await wooCommerceApiService.updateOrderStatus(
          currentOrder.woo_order_id,
          'completed',
          trackingNumber,
          carrier,
          currentOrder.user_id
        );

        // Then update the shipment tracking information
        await wooCommerceApiService.updateShipmentTracking(
          currentOrder.woo_order_id,
          trackingNumber,
          carrier,
          currentOrder.user_id
        );

        console.log('✅ Successfully updated WooCommerce order status to completed and shipment tracking');
      } catch (wooError) {
        console.error('Failed to update WooCommerce order:', wooError);
        toast.error('Tracking updated locally, but failed to sync with WooCommerce');
      }
    }

    // Record stage movement
    try {
      await orderStageMovementService.recordStageMovement(
        orderId,
        previousStage,
        'shipped',
        `Order shipped with tracking: ${trackingNumber} via ${carrier}`
      );
    } catch (movementError) {
      console.error('Error recording tracking stage movement:', movementError);
    }

    const order = transformDatabaseOrder(data);
    console.log(`✅ Successfully updated tracking for order ${order.order_number}`);

    toast.success(`Order moved to shipped stage with tracking: ${trackingNumber} via ${carrier}. WooCommerce status updated to completed.`);

    return order;
  },

  async searchOrders(query: string): Promise<WooCommerceOrder[]> {
    console.log(`Searching orders for: ${query}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.ilike.%${query}%,customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,tracking_number.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} orders matching "${query}"`);
    return (data || []).map(transformDatabaseOrder);
  },

  async markAllItemsPacked(orderId: string): Promise<void> {
    console.log(`Marking all items as packed for order ${orderId}`);
    
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('line_items')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order for bulk pack:', fetchError);
      throw fetchError;
    }

    const lineItems = Array.isArray(order.line_items) ? (order.line_items as unknown as WooCommerceOrderItem[]) : [];
    const updatedLineItems = lineItems.map((item: WooCommerceOrderItem) => ({
      ...item,
      packed: true
    }));

    const { error } = await supabase
      .from('orders')
      .update({ line_items: updatedLineItems as unknown as any })
      .eq('id', orderId);

    if (error) {
      console.error('Error marking all items as packed:', error);
      throw error;
    }

    console.log(`Successfully marked all items as packed for order ${orderId}`);
    toast.success('All items marked as packed');
  },

  async getPackingProgress(orderId: string): Promise<{ packed: number; total: number; percentage: number }> {
    console.log(`Getting packing progress for order ${orderId}`);
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('line_items')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order for progress:', error);
      throw error;
    }

    const lineItems = Array.isArray(order.line_items) ? (order.line_items as unknown as WooCommerceOrderItem[]) : [];
    const total = lineItems.length;
    const packed = lineItems.filter((item: WooCommerceOrderItem) => item.packed).length;
    const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

    return { packed, total, percentage };
  },

  async getOrderStageHistory(orderId: string) {
    return orderStageMovementService.getOrderStageHistory(orderId);
  },

  async getRecentStageMovements(limit: number = 50) {
    return orderStageMovementService.getRecentStageMovements(limit);
  }
};
