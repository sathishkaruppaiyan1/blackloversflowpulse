import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('📊 Analytics orders fetch function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_url, consumer_key, consumer_secret } = await req.json();

    if (!store_url || !consumer_key || !consumer_secret) {
      return new Response(
        JSON.stringify({ error: 'Missing store_url, consumer_key, or consumer_secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanStoreUrl = store_url.trim().replace(/\/$/, '');
    if (!cleanStoreUrl.startsWith('http://') && !cleanStoreUrl.startsWith('https://')) {
      cleanStoreUrl = 'https://' + cleanStoreUrl;
    }

    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    const allOrders: any[] = [];
    const perPage = 100;

    // Fetch processing, on-hold, and completed orders separately
    // WooCommerce REST API only accepts one status per request
    const statuses = ['processing', 'on-hold', 'completed'];

    for (const status of statuses) {
      let page = 1;
      console.log(`📊 Fetching "${status}" orders for analytics...`);

      while (true) {
        const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&status=${status}&order=desc&orderby=date`;
        console.log(`📄 Fetching ${status} page ${page}...`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
            'User-Agent': 'OrderSync/1.0',
          },
        });

        if (!response.ok) {
          console.error(`❌ Error fetching ${status} orders: ${response.status}`);
          // Skip this status, continue with others
          break;
        }

        const pageOrders = await response.json();

        if (!Array.isArray(pageOrders) || pageOrders.length === 0) {
          console.log(`✅ No more "${status}" orders on page ${page}`);
          break;
        }

        allOrders.push(...pageOrders);
        console.log(`✅ Fetched ${pageOrders.length} "${status}" orders (page ${page}), total: ${allOrders.length}`);

        if (pageOrders.length < perPage) {
          break;
        }

        page++;
      }
    }

    console.log(`📊 Analytics total: ${allOrders.length} orders (processing + on-hold + completed)`);

    return new Response(
      JSON.stringify({ orders: allOrders }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Analytics fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
