
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, TrendingDown, RotateCcw, ShoppingCart } from 'lucide-react';
import { useStockMovements, useProducts } from '@/hooks/useInventory';
import { StockMovementDialog } from './StockMovementDialog';
import { format } from 'date-fns';

export const StockMovementsPage = () => {
  const { movements, loading } = useStockMovements();
  const { products } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');

  const filteredMovements = selectedProduct 
    ? movements.filter(m => m.product_id === selectedProduct)
    : movements;

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
      case 'restock':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'out':
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <RotateCcw className="h-4 w-4 text-blue-500" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const badges = {
      'in': <Badge className="bg-green-100 text-green-800">Stock In</Badge>,
      'out': <Badge className="bg-red-100 text-red-800">Stock Out</Badge>,
      'sale': <Badge className="bg-purple-100 text-purple-800">Sale</Badge>,
      'adjustment': <Badge className="bg-blue-100 text-blue-800">Adjustment</Badge>,
      'restock': <Badge className="bg-green-100 text-green-800">Restock</Badge>
    };
    return badges[type as keyof typeof badges] || <Badge variant="outline">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Movements</h1>
          <p className="text-muted-foreground">Track all inventory movements and transactions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Movement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <select
              className="px-3 py-2 border rounded-md"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading movements...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.product?.name}</div>
                        <div className="text-sm text-muted-foreground">{movement.product?.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        {getMovementBadge(movement.movement_type)}
                      </div>
                    </TableCell>
                    <TableCell className={movement.movement_type === 'out' || movement.movement_type === 'sale' ? 'text-red-600' : 'text-green-600'}>
                      {movement.movement_type === 'out' || movement.movement_type === 'sale' ? '-' : '+'}
                      {movement.quantity}
                    </TableCell>
                    <TableCell>
                      {movement.reference_id && (
                        <div>
                          <div className="text-sm">{movement.reference_id}</div>
                          <div className="text-xs text-muted-foreground capitalize">{movement.reference_type}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{movement.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredMovements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No stock movements found.
            </div>
          )}
        </CardContent>
      </Card>

      <StockMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        products={products}
      />
    </div>
  );
};
