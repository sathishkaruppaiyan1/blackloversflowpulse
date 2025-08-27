
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useStockMovements } from '@/hooks/useInventory';
import { Product } from '@/services/inventoryService';

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

export const StockMovementDialog: React.FC<StockMovementDialogProps> = ({
  open,
  onOpenChange,
  products
}) => {
  const { recordMovement } = useStockMovements();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in' as 'in' | 'out' | 'adjustment' | 'sale',
    quantity: '',
    reference_id: '',
    reference_type: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await recordMovement({
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity: parseInt(formData.quantity) || 0,
        reference_id: formData.reference_id || undefined,
        reference_type: formData.reference_type || undefined,
        notes: formData.notes || undefined
      });

      setFormData({
        product_id: '',
        movement_type: 'in',
        quantity: '',
        reference_id: '',
        reference_type: '',
        notes: ''
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording movement:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Product *</Label>
            <select
              id="product"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) - Current: {product.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="movement_type">Movement Type *</Label>
              <select
                id="movement_type"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.movement_type}
                onChange={(e) => setFormData({ ...formData, movement_type: e.target.value as any })}
                required
              >
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="sale">Sale</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference_id">Reference ID</Label>
              <Input
                id="reference_id"
                value={formData.reference_id}
                onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                placeholder="Order ID, Invoice #, etc."
              />
            </div>
            <div>
              <Label htmlFor="reference_type">Reference Type</Label>
              <Input
                id="reference_type"
                value={formData.reference_type}
                onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                placeholder="order, invoice, return, etc."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes about this movement..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Movement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
