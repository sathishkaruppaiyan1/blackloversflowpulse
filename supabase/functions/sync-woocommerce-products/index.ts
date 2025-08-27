
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { store_url, consumer_key, consumer_secret, user_id } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch products from WooCommerce
    const wooAuth = btoa(`${consumer_key}:${consumer_secret}`);
    
    const productsResponse = await fetch(`${store_url}/wp-json/wc/v3/products`, {
      headers: {
        'Authorization': `Basic ${wooAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`WooCommerce API error: ${productsResponse.statusText}`);
    }

    const wooProducts = await productsResponse.json();

    // Fetch categories from WooCommerce
    const categoriesResponse = await fetch(`${store_url}/wp-json/wc/v3/products/categories`, {
      headers: {
        'Authorization': `Basic ${wooAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!categoriesResponse.ok) {
      throw new Error(`WooCommerce Categories API error: ${categoriesResponse.statusText}`);
    }

    const wooCategories = await categoriesResponse.json();

    // Sync categories first
    for (const wooCategory of wooCategories) {
      await supabase
        .from('product_categories')
        .upsert({
          user_id,
          name: wooCategory.name,
          description: wooCategory.description || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,name'
        });
    }

    // Sync products
    for (const wooProduct of wooProducts) {
      // Find category by name
      let category_id = null;
      if (wooProduct.categories && wooProduct.categories.length > 0) {
        const { data: categoryData } = await supabase
          .from('product_categories')
          .select('id')
          .eq('user_id', user_id)
          .eq('name', wooProduct.categories[0].name)
          .single();
        
        category_id = categoryData?.id || null;
      }

      await supabase
        .from('products')
        .upsert({
          user_id,
          name: wooProduct.name,
          sku: wooProduct.sku || `product-${wooProduct.id}`,
          category: wooProduct.categories?.[0]?.name || 'Uncategorized',
          price: parseFloat(wooProduct.price) || 0,
          cost_price: parseFloat(wooProduct.regular_price) || 0,
          stock_quantity: wooProduct.stock_quantity || 0,
          min_stock_level: 10, // Default minimum stock level
          max_stock_level: 1000, // Default maximum stock level
          is_active: wooProduct.status === 'publish',
          description: wooProduct.description || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,sku'
        });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Products synced successfully',
        synced_products: wooProducts.length,
        synced_categories: wooCategories.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error syncing WooCommerce products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
