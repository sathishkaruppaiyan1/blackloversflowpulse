
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping: {
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
  };
  line_items: any[];
  meta_data?: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

serve(async (req) => {
  console.log('🚀 WooCommerce fetch function called');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Reading request body...');
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { store_url, consumer_key, consumer_secret, order_id } = requestBody;

    if (!store_url || !consumer_key || !consumer_secret) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing store_url, consumer_key, or consumer_secret' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🏪 Store URL:', store_url);
    console.log('🔑 Consumer Key:', consumer_key.substring(0, 10) + '...');

    // Clean up store URL and construct proper WooCommerce API endpoint
    let cleanStoreUrl = store_url.trim().replace(/\/$/, '');
    
    // Ensure we have the proper protocol
    if (!cleanStoreUrl.startsWith('http://') && !cleanStoreUrl.startsWith('https://')) {
      cleanStoreUrl = 'https://' + cleanStoreUrl;
    }
    
    // Construct the WooCommerce REST API URL
    const apiUrl = order_id 
      ? `${cleanStoreUrl}/wp-json/wc/v3/orders/${order_id}`
      : `${cleanStoreUrl}/wp-json/wc/v3/orders?per_page=100&order=desc&orderby=date`;
    
    console.log('🔗 Final API URL:', apiUrl);
    
    // Create Basic Auth header
    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    
    console.log('📤 Making request to WooCommerce API...');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OrderSync/1.0',
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response statusText:', response.statusText);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WooCommerce API error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      
      let errorMessage = `WooCommerce API error: ${response.status} ${response.statusText}`;
      
      // Provide more helpful error messages based on status codes
      if (response.status === 404) {
        errorMessage = 'WooCommerce API endpoint not found. Please check if WooCommerce is installed and REST API is enabled.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your Consumer Key and Consumer Secret.';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Please check your API permissions.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText,
          status_code: response.status,
          suggestions: [
            'Verify WooCommerce is installed and activated',
            'Check if REST API is enabled in WooCommerce settings',
            'Ensure Consumer Key and Secret are valid and have read permissions',
            'Try accessing the API URL directly in your browser'
          ]
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const responseData = await response.json();
    console.log(`✅ Successfully fetched ${order_id ? '1 order' : responseData.length + ' orders'}`);
    console.log('Response data sample:', JSON.stringify(responseData).substring(0, 200) + '...');

    // Handle both single order and multiple orders
    if (order_id) {
      return new Response(
        JSON.stringify({ order: responseData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ orders: responseData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('💥 Unexpected error in fetch-woocommerce-orders function:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        suggestions: [
          'Check your internet connection',
          'Verify the store URL is accessible',
          'Ensure WooCommerce REST API is properly configured'
        ]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
