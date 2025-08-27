
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  user_id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'sale';
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  product?: Product;
}

export interface ProductCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class InventoryService {
  // Products
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createProduct(product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Stock Movements
  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(*)
      `)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      movement_type: item.movement_type as 'in' | 'out' | 'adjustment' | 'sale'
    }));
  }

  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'user_id' | 'created_at'>): Promise<StockMovement> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        ...movement,
        user_id: user.id,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      movement_type: data.movement_type as 'in' | 'out' | 'adjustment' | 'sale'
    };
  }

  // Categories
  async getCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createCategory(category: Omit<ProductCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ProductCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        ...category,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Reports
  async getSalesReport(startDate?: string, endDate?: string, category?: string): Promise<any[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(*)
      `)
      .eq('movement_type', 'sale');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    let movements = data || [];
    
    // Filter by category if specified
    if (category) {
      movements = movements.filter(m => m.product?.category === category);
    }

    return movements;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    
    // Filter products where stock_quantity <= min_stock_level
    const lowStockProducts = (data || []).filter(product => 
      product.stock_quantity <= (product.min_stock_level || 0)
    );
    
    return lowStockProducts;
  }

  async getStockSummary(): Promise<any> {
    const products = await this.getProducts();
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0);
    const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
    const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount
    };
  }
}

export const inventoryService = new InventoryService();
