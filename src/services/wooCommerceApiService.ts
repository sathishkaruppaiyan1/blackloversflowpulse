
import { supabase } from '@/integrations/supabase/client';

export interface WooCommerceCredentials {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}

// Helper function to convert display names to tracking provider codes
const getTrackingProviderCode = (carrierDisplayName: string): string => {
  switch (carrierDisplayName.toLowerCase()) {
    case 'franch express':
      return 'franch-express';
    case 'delhivery':
      return 'delhivery';
    default:
      return carrierDisplayName.toLowerCase().replace(/\s+/g, '-');
  }
};

export const wooCommerceApiService = {
  async getCredentials(userId: string): Promise<WooCommerceCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('woocommerce_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching WooCommerce credentials:', error);
        return null;
      }

      return {
        store_url: data.store_url,
        consumer_key: data.consumer_key,
        consumer_secret: data.consumer_secret
      };
    } catch (error) {
      console.error('Failed to get WooCommerce credentials:', error);
      return null;
    }
  },

  async updateOrderStatus(
    wooOrderId: string, 
    status: 'completed' | 'processing' | 'shipped',
    trackingNumber?: string,
    carrier?: string,
    userId?: string
  ): Promise<boolean> {
    if (!userId) {
      console.error('User ID is required for WooCommerce API update');
      return false;
    }

    try {
      console.log(`🔄 Updating WooCommerce order ${wooOrderId} status to ${status}`);
      
      const credentials = await this.getCredentials(userId);
      if (!credentials) {
        console.error('WooCommerce credentials not found');
        return false;
      }

      // Prepare update data
      const updateData: any = {
        status: status
      };

      // Add tracking info if provided
      if (trackingNumber && carrier) {
        updateData.meta_data = [
          {
            key: 'tracking_number',
            value: trackingNumber
          },
          {
            key: 'shipping_carrier',
            value: carrier
          }
        ];
      }

      const result = await supabase.functions.invoke('update-woocommerce-order', {
        body: {
          store_url: credentials.store_url,
          consumer_key: credentials.consumer_key,
          consumer_secret: credentials.consumer_secret,
          order_id: wooOrderId,
          update_data: updateData
        }
      });

      if (result.error) {
        console.error('Error updating WooCommerce order:', result.error);
        return false;
      }

      console.log(`✅ Successfully updated WooCommerce order ${wooOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to update WooCommerce order:', error);
      return false;
    }
  },

  async updateShipmentTracking(
    wooOrderId: string,
    trackingNumber: string,
    carrier: string,
    userId: string
  ): Promise<boolean> {
    try {
      console.log(`🚚 Updating WooCommerce shipment tracking for order ${wooOrderId}`);
      
      const credentials = await this.getCredentials(userId);
      if (!credentials) {
        console.error('WooCommerce credentials not found');
        return false;
      }

      // Convert carrier to tracking provider code
      const trackingProvider = getTrackingProviderCode(carrier);
      const dateShipped = new Date().toISOString().split('T')[0];

      const result = await supabase.functions.invoke('update-woocommerce-tracking', {
        body: {
          store_url: credentials.store_url,
          consumer_key: credentials.consumer_key,
          consumer_secret: credentials.consumer_secret,
          order_id: wooOrderId,
          tracking_provider: trackingProvider,
          tracking_number: trackingNumber,
          date_shipped: dateShipped
        }
      });

      if (result.error) {
        console.error('Error updating WooCommerce shipment tracking:', result.error);
        return false;
      }

      console.log(`✅ Successfully updated WooCommerce shipment tracking for order ${wooOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to update WooCommerce shipment tracking:', error);
      return false;
    }
  }
};
