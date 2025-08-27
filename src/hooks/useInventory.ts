
import { useState, useEffect } from 'react';
import { inventoryService, Product, StockMovement, ProductCategory } from '@/services/inventoryService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchProducts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await inventoryService.getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await inventoryService.createProduct(product);
      setProducts(prev => [...prev, newProduct]);
      toast.success('Product created successfully');
      return newProduct;
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await inventoryService.updateProduct(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      toast.success('Product updated successfully');
      return updatedProduct;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await inventoryService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts
  };
};

export const useStockMovements = (productId?: string) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchMovements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await inventoryService.getStockMovements(productId);
      setMovements(data);
    } catch (error: any) {
      console.error('Error fetching stock movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const recordMovement = async (movement: Omit<StockMovement, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const newMovement = await inventoryService.recordStockMovement(movement);
      setMovements(prev => [newMovement, ...prev]);
      toast.success('Stock movement recorded successfully');
      return newMovement;
    } catch (error: any) {
      console.error('Error recording stock movement:', error);
      toast.error('Failed to record stock movement');
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchMovements();
    }
  }, [user, productId]);

  return {
    movements,
    loading,
    fetchMovements,
    recordMovement,
    refetch: fetchMovements
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await inventoryService.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (category: Omit<ProductCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCategory = await inventoryService.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
      toast.success('Category created successfully');
      return newCategory;
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    refetch: fetchCategories
  };
};
