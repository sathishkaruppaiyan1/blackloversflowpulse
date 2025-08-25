
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
    console.log('🔄 Starting WooCommerce order update...');
    
    const { store_url, consumer_key, consumer_secret, order_id, update_data } = await req.json();

    if (!store_url || !consumer_key || !consumer_secret || !order_id || !update_data) {
      console.error('Missing required parameters for WooCommerce update');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: store_url, consumer_key, consumer_secret, order_id, or update_data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📦 Updating WooCommerce order ${order_id} with status: ${update_data.status}`);

    // Clean up store URL and construct proper WooCommerce API endpoint
    let cleanStoreUrl = store_url.trim().replace(/\/$/, '');
    
    // Ensure we have the proper protocol
    if (!cleanStoreUrl.startsWith('http://') && !cleanStoreUrl.startsWith('https://')) {
      cleanStoreUrl = 'https://' + cleanStoreUrl;
    }
    
    // Construct the WooCommerce REST API URL for updating order
    const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders/${order_id}`;
    
    console.log('🔗 API URL:', apiUrl);
    console.log('📋 Update data:', JSON.stringify(update_data, null, 2));
    
    // Create Basic Auth header
    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    
    console.log('📤 Making PUT request to WooCommerce API...');
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OrderSync/1.0',
      },
      body: JSON.stringify(update_data)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WooCommerce API error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      
      let errorMessage = `WooCommerce API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 404) {
        errorMessage = `Order ${order_id} not found in WooCommerce store.`;
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your Consumer Key and Consumer Secret.';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Please check your API permissions for order updates.';
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
    console.log('✅ Successfully updated WooCommerce order:', responseData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: responseData,
        message: `Order ${order_id} updated successfully`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error in update-woocommerce-order function:', error);
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
