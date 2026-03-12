
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

// Fetch variation images for all order line items
// Strategy: fetch all variations per product, build color→image map, match by ordered color
async function enrichLineItemsWithImages(
  orders: any[],
  cleanStoreUrl: string,
  authString: string
): Promise<void> {
  const authHeaders = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/json',
    'User-Agent': 'OrderSync/1.0',
  };

  // Collect unique product_ids from all order line items
  const productIds = new Set<number>();
  for (const order of orders) {
    if (!order.line_items) continue;
    for (const item of order.line_items) {
      if (item.product_id) productIds.add(item.product_id);
    }
  }

  if (productIds.size === 0) return;
  console.log(`🖼️ Fetching variation images for ${productIds.size} unique products...`);

  // For each product: fetch all its variations and build two maps:
  // 1. productMainImageMap: productId -> main product image URL (fallback)
  // 2. colorImageMap: productId -> { "teal": "url", "wine": "url", ... }
  const productMainImageMap = new Map<number, string>();
  const colorImageMap = new Map<number, Record<string, string>>();

  // Helper: extract color value from a variation's attributes
  const getColorFromAttributes = (attributes: any[]): string => {
    if (!Array.isArray(attributes)) return '';
    const colorAttr = attributes.find((a: any) =>
      String(a.name || a.slug || '').toLowerCase().includes('color') ||
      String(a.name || a.slug || '').toLowerCase().includes('colour')
    );
    return colorAttr?.option ? String(colorAttr.option).toLowerCase().trim() : '';
  };

  // Helper: extract color from order line item meta_data
  const getItemColor = (item: any): string => {
    if (item.color && String(item.color).trim()) return String(item.color).toLowerCase().trim();
    if (!Array.isArray(item.meta_data)) return '';
    for (const meta of item.meta_data) {
      const key = String(meta?.key || meta?.display_key || '').toLowerCase();
      if (key.includes('color') || key.includes('colour')) {
        const val = String(meta?.value || meta?.display_value || '').trim();
        if (val) return val.toLowerCase();
      }
    }
    return '';
  };

  // Fetch all products (main image) and all their variations in parallel
  await Promise.all(Array.from(productIds).map(async (productId) => {
    try {
      // Fetch product main image
      const productRes = await fetch(
        `${cleanStoreUrl}/wp-json/wc/v3/products/${productId}?_fields=id,images`,
        { headers: authHeaders }
      );
      if (productRes.ok) {
        const product = await productRes.json();
        const mainImage = product?.images?.[0]?.src;
        if (mainImage) productMainImageMap.set(productId, mainImage);
      }

      // Fetch ALL variations for this product
      const variationsRes = await fetch(
        `${cleanStoreUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100&_fields=id,attributes,image`,
        { headers: authHeaders }
      );
      if (!variationsRes.ok) return;

      const variations = await variationsRes.json();
      if (!Array.isArray(variations) || variations.length === 0) return;

      const colorMap: Record<string, string> = {};
      for (const variation of variations) {
        const color = getColorFromAttributes(variation.attributes);
        const imgSrc = variation?.image?.src;
        const imgId = variation?.image?.id;

        // Only use image if it has a real id (id > 0 means a real assigned image, not placeholder)
        if (color && imgSrc && imgId && Number(imgId) > 0) {
          colorMap[color] = imgSrc;
        }
      }

      if (Object.keys(colorMap).length > 0) {
        colorImageMap.set(productId, colorMap);
        console.log(`✅ Product ${productId}: found variation images for colors: ${Object.keys(colorMap).join(', ')}`);
      }
    } catch (err) {
      console.log(`⚠️ Error fetching product/variations for ${productId}:`, err);
    }
  }));

  console.log(`📦 Color image maps built for ${colorImageMap.size} products`);

  // Enrich each order line item with the correct variation image
  for (const order of orders) {
    if (!order.line_items) continue;
    for (const item of order.line_items) {
      const productId = item.product_id;
      const colorMap = colorImageMap.get(productId) || {};
      const mainImage = productMainImageMap.get(productId) || item.image?.src || null;
      const orderedColor = getItemColor(item);

      let variationImage: string | null = null;

      if (orderedColor && Object.keys(colorMap).length > 0) {
        // Exact match first
        variationImage = colorMap[orderedColor] || null;

        // Fuzzy match if no exact match
        if (!variationImage) {
          const entry = Object.entries(colorMap).find(
            ([k]) => k.includes(orderedColor) || orderedColor.includes(k)
          );
          if (entry) variationImage = entry[1];
        }
      }

      if (variationImage) {
        console.log(`🎨 Order ${order.number} item "${item.name}" color "${orderedColor}" → ${variationImage}`);
      }

      // Set variation_image (color-specific) and product_image (main fallback)
      item.variation_image = variationImage || null;
      item.product_image = mainImage || null;

      // item.image = variation image if found, otherwise keep original
      const resolvedImage = variationImage || item.image?.src || mainImage;
      if (resolvedImage) {
        item.image = { id: '', src: resolvedImage };
      }
    }
  }
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

    const authString = btoa(`${consumer_key}:${consumer_secret}`);

    // Handle single order request
    if (order_id) {
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders/${order_id}`;
      console.log('🔗 Final API URL:', apiUrl);

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

    // Fetch orders with pagination (defaults to processing, analytics can pass other statuses)
    const allOrders: any[] = [];
    let page = 1;
    const perPage = 100; // WooCommerce max per page
    const orderStatus = requestBody.status || 'processing';

    console.log(`📤 Fetching all ${orderStatus} orders with pagination...`);

    while (true) {
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&status=${orderStatus}&order=desc&orderby=date`;
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

    // Enrich line items with product/variation images
    // This handles WPC Additional Variation Images plugin and standard WooCommerce images
    try {
      await enrichLineItemsWithImages(allOrders, cleanStoreUrl, authString);
    } catch (enrichError) {
      console.error('⚠️ Error enriching line items with images (continuing without):', enrichError);
    }

    console.log(`✅ Successfully fetched ${allOrders.length} total ${orderStatus} orders`);
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



