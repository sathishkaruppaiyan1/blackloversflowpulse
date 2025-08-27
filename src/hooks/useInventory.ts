
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useInventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['products', user?.id],
    queryFn: () => inventoryService.getProducts(user!.id),
    enabled: !!user?.id
  });

  const categories = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: () => inventoryService.getCategories(user!.id),
    enabled: !!user?.id
  });

  const lowStockProducts = useQuery({
    queryKey: ['low-stock-products', user?.id],
    queryFn: () => inventoryService.getLowStockProducts(user!.id),
    enabled: !!user?.id
  });

  const outOfStockProducts = useQuery({
    queryKey: ['out-of-stock-products', user?.id],
    queryFn: () => inventoryService.getOutOfStockProducts(user!.id),
    enabled: !!user?.id
  });

  const syncProducts = useMutation({
    mutationFn: () => inventoryService.syncProductsFromWooCommerce(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Products synced successfully from WooCommerce');
    },
    onError: (error) => {
      toast.error('Failed to sync products: ' + error.message);
    }
  });

  return {
    products,
    categories,
    lowStockProducts,
    outOfStockProducts,
    syncProducts
  };
};

export const useStockMovements = (filters?: {
  productId?: string;
  startDate?: string;
  endDate?: string;
  movementType?: string;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const stockMovements = useQuery({
    queryKey: ['stock-movements', user?.id, filters],
    queryFn: () => inventoryService.getStockMovements(user!.id, filters),
    enabled: !!user?.id
  });

  const addStockMovement = useMutation({
    mutationFn: (movement: any) => inventoryService.addStockMovement(user!.id, movement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock movement recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record stock movement: ' + error.message);
    }
  });

  return {
    stockMovements,
    addStockMovement
  };
};
