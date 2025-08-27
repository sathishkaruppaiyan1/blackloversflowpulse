
import { supabase } from '@/integrations/supabase/client';
import { wooCommerceApiService } from './wooCommerceApiService';

export interface Product {
  id: string;
  woo_product_id?: number;
  name: string;
  sku: string | null;
  category_id: string | null;
  price: number;
  cost_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'sale' | 'adjustment';
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export const inventoryService = {
  // Fetch products from local database
  async getProducts(userId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        category,
        price,
        cost_price,
        stock_quantity,
        min_stock_level,
        max_stock_level,
        is_active,
        description,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    
    // Map database columns to interface properties
    return (data || []).map(item => ({
      id: item.id,
      woo_product_id: undefined,
      name: item.name,
      sku: item.sku,
      category_id: null,
      price: item.price,
      cost_price: item.cost_price,
      current_stock: item.stock_quantity,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
      status: item.is_active ? 'active' : 'inactive',
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },

  // Fetch categories from local database
  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Fetch stock movements
  async getStockMovements(userId: string, filters?: {
    productId?: string;
    startDate?: string;
    endDate?: string;
    movementType?: string;
  }): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .eq('user_id', userId);

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      movement_type: item.movement_type as 'in' | 'out' | 'sale' | 'adjustment',
      quantity: item.quantity,
      reference_id: item.reference_id,
      notes: item.notes,
      created_at: item.created_at
    }));
  },

  // Sync products from WooCommerce
  async syncProductsFromWooCommerce(userId: string): Promise<void> {
    const credentials = await wooCommerceApiService.getCredentials(userId);
    if (!credentials) {
      throw new Error('WooCommerce credentials not found');
    }

    // Call edge function to fetch WooCommerce products
    const { data, error } = await supabase.functions.invoke('sync-woocommerce-products', {
      body: {
        store_url: credentials.store_url,
        consumer_key: credentials.consumer_key,
        consumer_secret: credentials.consumer_secret,
        user_id: userId
      }
    });

    if (error) throw error;
    return data;
  },

  // Add stock movement
  async addStockMovement(userId: string, movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('stock_movements')
      .insert({
        ...movement,
        user_id: userId
      });

    if (error) throw error;
  },

  // Get low stock products
  async getLowStockProducts(userId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        category,
        price,
        cost_price,
        stock_quantity,
        min_stock_level,
        max_stock_level,
        is_active,
        description,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .filter('stock_quantity', 'lte', 'min_stock_level')
      .order('stock_quantity');

    if (error) throw error;
    
    // Map database columns to interface properties
    return (data || []).map(item => ({
      id: item.id,
      woo_product_id: undefined,
      name: item.name,
      sku: item.sku,
      category_id: null,
      price: item.price,
      cost_price: item.cost_price,
      current_stock: item.stock_quantity,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
      status: item.is_active ? 'active' : 'inactive',
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },

  // Get out of stock products
  async getOutOfStockProducts(userId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        category,
        price,
        cost_price,
        stock_quantity,
        min_stock_level,
        max_stock_level,
        is_active,
        description,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('stock_quantity', 0)
      .order('name');

    if (error) throw error;
    
    // Map database columns to interface properties
    return (data || []).map(item => ({
      id: item.id,
      woo_product_id: undefined,
      name: item.name,
      sku: item.sku,
      category_id: null,
      price: item.price,
      cost_price: item.cost_price,
      current_stock: item.stock_quantity,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
      status: item.is_active ? 'active' : 'inactive',
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }
};
