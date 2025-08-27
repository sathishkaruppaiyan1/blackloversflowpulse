
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';

const InventoryDashboard = () => {
  const { products, lowStockProducts, outOfStockProducts, syncProducts } = useInventory();

  const totalProducts = products.data?.length || 0;
  const lowStockCount = lowStockProducts.data?.length || 0;
  const outOfStockCount = outOfStockProducts.data?.length || 0;
  const inStockCount = totalProducts - outOfStockCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
        <Button
          onClick={() => syncProducts.mutate()}
          disabled={syncProducts.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncProducts.isPending ? 'animate-spin' : ''}`} />
          Sync WooCommerce
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              All products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Products available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Below minimum level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.isLoading ? (
              <p>Loading...</p>
            ) : lowStockProducts.data?.length === 0 ? (
              <p className="text-muted-foreground">No products with low stock</p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.data?.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm">{product.name}</span>
                    <Badge variant="destructive">{product.current_stock}</Badge>
                  </div>
                ))}
                {lowStockProducts.data && lowStockProducts.data.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{lowStockProducts.data.length - 5} more products
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStockProducts.isLoading ? (
              <p>Loading...</p>
            ) : outOfStockProducts.data?.length === 0 ? (
              <p className="text-muted-foreground">No products out of stock</p>
            ) : (
              <div className="space-y-2">
                {outOfStockProducts.data?.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm">{product.name}</span>
                    <Badge variant="destructive">0</Badge>
                  </div>
                ))}
                {outOfStockProducts.data && outOfStockProducts.data.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{outOfStockProducts.data.length - 5} more products
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryDashboard;
