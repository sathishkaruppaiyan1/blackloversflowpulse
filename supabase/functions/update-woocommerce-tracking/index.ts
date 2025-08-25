
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting WooCommerce shipment tracking update...');
    
    const { store_url, consumer_key, consumer_secret, order_id, tracking_provider, tracking_number, date_shipped } = await req.json();

    if (!store_url || !consumer_key || !consumer_secret || !order_id || !tracking_provider || !tracking_number) {
      console.error('Missing required parameters for WooCommerce tracking update');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: store_url, consumer_key, consumer_secret, order_id, tracking_provider, or tracking_number' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📦 Updating WooCommerce tracking for order ${order_id} with tracking: ${tracking_number}`);

    // Clean up store URL and construct proper WooCommerce API endpoint
    let cleanStoreUrl = store_url.trim().replace(/\/$/, '');
    
    // Ensure we have the proper protocol
    if (!cleanStoreUrl.startsWith('http://') && !cleanStoreUrl.startsWith('https://')) {
      cleanStoreUrl = 'https://' + cleanStoreUrl;
    }
    
    // Construct the WooCommerce Shipment Tracking API URL
    const apiUrl = `${cleanStoreUrl}/wp-json/wc-shipment-tracking/v3/orders/${order_id}/shipment-trackings`;
    
    console.log('🔗 API URL:', apiUrl);
    
    // Prepare tracking data
    const trackingData = {
      tracking_provider: tracking_provider,
      tracking_number: tracking_number,
      date_shipped: date_shipped || new Date().toISOString().split('T')[0], // Use current date if not provided
      status_shipped: 1
    };
    
    console.log('📋 Tracking data:', JSON.stringify(trackingData, null, 2));
    
    // Create Basic Auth header
    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    
    console.log('📤 Making POST request to WooCommerce Shipment Tracking API...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OrderSync/1.0',
      },
      body: JSON.stringify(trackingData)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WooCommerce Shipment Tracking API error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      
      let errorMessage = `WooCommerce Shipment Tracking API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 404) {
        errorMessage = `Order ${order_id} not found or shipment tracking endpoint not available.`;
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your Consumer Key and Consumer Secret.';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Please check your API permissions for shipment tracking.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText,
          order_id: order_id
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const responseData = await response.json();
    console.log('✅ Successfully updated WooCommerce shipment tracking:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracking: responseData,
        message: `Shipment tracking updated successfully for order ${order_id}`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error in update-woocommerce-tracking function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
