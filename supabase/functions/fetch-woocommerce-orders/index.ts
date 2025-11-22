
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
    
    // Handle single order request
    if (order_id) {
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders/${order_id}`;
      console.log('🔗 Final API URL:', apiUrl);
      
      const authString = btoa(`${consumer_key}:${consumer_secret}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OrderSync/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `WooCommerce API error: ${response.status}` }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const responseData = await response.json();
      return new Response(
        JSON.stringify({ order: responseData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch all processing orders with pagination
    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    const allOrders: any[] = [];
    let page = 1;
    const perPage = 100; // WooCommerce max per page
    
    console.log('📤 Fetching all processing orders with pagination...');
    
    while (true) {
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&status=processing&order=desc&orderby=date`;
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OrderSync/1.0',
        },
      });

      console.log(`📊 Page ${page} response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ WooCommerce API error:', response.status, response.statusText);
        console.error('❌ Error details:', errorText);
        
        let errorMessage = `WooCommerce API error: ${response.status} ${response.statusText}`;
        
        if (response.status === 404) {
          errorMessage = 'WooCommerce API endpoint not found. Please check if WooCommerce is installed and REST API is enabled.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please check your Consumer Key and Consumer Secret.';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden. Please check your API permissions.';
        }
        
        // If we got some orders before error, return them
        if (allOrders.length > 0) {
          console.log(`⚠️ Error on page ${page}, but returning ${allOrders.length} orders fetched so far`);
          break;
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

      const pageOrders = await response.json();
      
      if (!Array.isArray(pageOrders) || pageOrders.length === 0) {
        console.log(`✅ No more orders on page ${page}, total fetched: ${allOrders.length}`);
        break;
      }
      
      allOrders.push(...pageOrders);
      console.log(`✅ Fetched ${pageOrders.length} orders from page ${page}, total so far: ${allOrders.length}`);
      
      // If we got fewer than perPage orders, we've reached the last page
      if (pageOrders.length < perPage) {
        console.log(`✅ Reached last page, total orders fetched: ${allOrders.length}`);
        break;
      }
      
      page++;
    }

    console.log(`✅ Successfully fetched ${allOrders.length} total processing orders`);
    console.log('Response data sample:', JSON.stringify(allOrders[0] || {}).substring(0, 200) + '...');

    return new Response(
      JSON.stringify({ orders: allOrders }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error in fetch-woocommerce-orders function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : String(error));
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
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
