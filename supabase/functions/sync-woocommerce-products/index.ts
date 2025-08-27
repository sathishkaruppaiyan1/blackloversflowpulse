
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { store_url, consumer_key, consumer_secret, user_id } = await req.json()

    if (!store_url || !consumer_key || !consumer_secret || !user_id) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch products from WooCommerce API
    const auth = btoa(`${consumer_key}:${consumer_secret}`)
    const wooResponse = await fetch(`${store_url}/wp-json/wc/v3/products?per_page=100`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })

    if (!wooResponse.ok) {
      throw new Error(`WooCommerce API error: ${wooResponse.statusText}`)
    }

    const wooProducts = await wooResponse.json()

    // Fetch categories from WooCommerce
    const categoriesResponse = await fetch(`${store_url}/wp-json/wc/v3/products/categories?per_page=100`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })

    const wooCategories = categoriesResponse.ok ? await categoriesResponse.json() : []

    // Sync categories first
    for (const wooCategory of wooCategories) {
      await supabase
        .from('categories')
        .upsert({
          user_id,
          name: wooCategory.name,
          description: wooCategory.description || '',
        }, {
          onConflict: 'user_id,name'
        })
    }

    // Get local categories for mapping
    const { data: localCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user_id)

    // Sync products
    const productsToUpsert = wooProducts.map((wooProduct: any) => {
      // Find matching local category
      const localCategory = localCategories?.find(cat => 
        wooProduct.categories.some((wooCat: any) => wooCat.name === cat.name)
      )

      return {
        user_id,
        woo_product_id: wooProduct.id,
        name: wooProduct.name,
        sku: wooProduct.sku || null,
        category_id: localCategory?.id || null,
        price: parseFloat(wooProduct.price) || 0,
        cost_price: 0, // WooCommerce doesn't provide cost price by default
        current_stock: wooProduct.stock_quantity || 0,
        min_stock_level: wooProduct.low_stock_amount || 10,
        max_stock_level: 1000,
        status: wooProduct.status === 'publish' ? 'active' : 'inactive',
        description: wooProduct.description || '',
      }
    })

    // Upsert products
    const { error } = await supabase
      .from('products')
      .upsert(productsToUpsert, {
        onConflict: 'woo_product_id'
      })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_products: productsToUpsert.length,
        synced_categories: wooCategories.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error syncing WooCommerce products:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
