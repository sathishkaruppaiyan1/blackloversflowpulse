
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

// Fetch product/variation images for line items that are missing images
async function enrichLineItemsWithImages(
  orders: any[],
  cleanStoreUrl: string,
  authString: string
): Promise<void> {
  // Collect unique product_id/variation_id pairs that need images
  const productIds = new Set<number>();
  const variationMap = new Map<number, Set<number>>(); // product_id -> Set<variation_id>

  for (const order of orders) {
    if (!order.line_items) continue;
    for (const item of order.line_items) {
      // Always collect - we'll fetch the best image available
      if (item.variation_id && item.variation_id > 0) {
        if (!variationMap.has(item.product_id)) {
          variationMap.set(item.product_id, new Set());
        }
        variationMap.get(item.product_id)!.add(item.variation_id);
      } else {
        productIds.add(item.product_id);
      }
    }
  }

  // Also add parent products for variations (we need them as fallback)
  for (const productId of variationMap.keys()) {
    productIds.add(productId);
  }

  if (productIds.size === 0 && variationMap.size === 0) return;

  console.log(`🖼️ Fetching images for ${productIds.size} products and ${variationMap.size} products with variations...`);

  // Build image map: "productId" or "productId-variationId" -> image URL
  const imageMap = new Map<string, string>();

  // Batch fetch products (up to 100 per request)
  const productIdArray = Array.from(productIds);
  for (let i = 0; i < productIdArray.length; i += 100) {
    const batch = productIdArray.slice(i, i + 100);
    const includeParam = batch.join(',');
    try {
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/products?include=${includeParam}&per_page=100`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OrderSync/1.0',
        },
      });

      if (response.ok) {
        const products = await response.json();
        for (const product of products) {
          if (product.images && product.images.length > 0) {
            imageMap.set(`${product.id}`, product.images[0].src);
          }
        }
        console.log(`✅ Fetched images for ${products.length} products`);
      } else {
        console.log(`⚠️ Failed to fetch product images: ${response.status}`);
      }
    } catch (err) {
      console.log(`⚠️ Error fetching product images:`, err);
    }
  }

  // Fetch variation images for each product that has variations
  for (const [productId, variationIds] of variationMap.entries()) {
    try {
      // Fetch all variations for this product (batch)
      const variationIdArray = Array.from(variationIds);
      const includeParam = variationIdArray.join(',');
      const apiUrl = `${cleanStoreUrl}/wp-json/wc/v3/products/${productId}/variations?include=${includeParam}&per_page=100`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OrderSync/1.0',
        },
      });

      if (response.ok) {
        const variations = await response.json();
        for (const variation of variations) {
          // Primary: variation's own featured image
          if (variation.image && variation.image.src) {
            imageMap.set(`${productId}-${variation.id}`, variation.image.src);
          }
          // Fallback: check WPC Additional Variation Images meta for extra images
          if (!imageMap.has(`${productId}-${variation.id}`) && variation.meta_data) {
            const wpcMeta = variation.meta_data.find(
              (m: any) => m.key === '_wc_additional_variation_images'
            );
            if (wpcMeta && wpcMeta.value) {
              // Value is comma-separated image IDs - we'll resolve the first one
              const imageIds = wpcMeta.value.split(',').map((id: string) => id.trim()).filter(Boolean);
              if (imageIds.length > 0) {
                // Fetch the first image from WordPress media API
                try {
                  const mediaUrl = `${cleanStoreUrl}/wp-json/wp/v2/media/${imageIds[0]}`;
                  const mediaResponse = await fetch(mediaUrl, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Basic ${authString}`,
                      'Content-Type': 'application/json',
                      'User-Agent': 'OrderSync/1.0',
                    },
                  });
                  if (mediaResponse.ok) {
                    const media = await mediaResponse.json();
                    if (media.source_url) {
                      imageMap.set(`${productId}-${variation.id}`, media.source_url);
                    }
                  }
                } catch (mediaErr) {
                  console.log(`⚠️ Error fetching WPC media for variation ${variation.id}:`, mediaErr);
                }
              }
            }
          }
        }
        console.log(`✅ Fetched images for ${variations.length} variations of product ${productId}`);
      } else {
        console.log(`⚠️ Failed to fetch variations for product ${productId}: ${response.status}`);
      }
    } catch (err) {
      console.log(`⚠️ Error fetching variations for product ${productId}:`, err);
    }
  }

  console.log(`🖼️ Total images resolved: ${imageMap.size}`);

  // Enrich line items with resolved images
  for (const order of orders) {
    if (!order.line_items) continue;
    for (const item of order.line_items) {
      // Try variation-specific image first, then product image, then existing image
      const variationKey = `${item.product_id}-${item.variation_id}`;
      const productKey = `${item.product_id}`;

      if (item.variation_id && item.variation_id > 0 && imageMap.has(variationKey)) {
        item.image = { id: '', src: imageMap.get(variationKey) };
      } else if (imageMap.has(productKey)) {
        // Only override if no image exists or image.src is empty
        if (!item.image || !item.image.src) {
          item.image = { id: '', src: imageMap.get(productKey) };
        }
      }
      // If line_item already has a valid image.src from the order API, keep it
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
