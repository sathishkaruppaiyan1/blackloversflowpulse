
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Printer, Phone } from 'lucide-react';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';
import PrintableLabel from './PrintableLabel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PrintingOrderCardProps {
  order: WooCommerceOrder;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPrint: () => void;
  onMoveToPacking: () => void;
}

export const PrintingOrderCard: React.FC<PrintingOrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  onPrint,
  onMoveToPacking
}) => {
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getProductDisplay = () => {
    if (!order.line_items || order.line_items.length === 0) {
      return { name: 'No products', variation: '', details: '' };
    }

    const firstItem = order.line_items[0];
    const variations = [];
    if (firstItem.color) variations.push(firstItem.color);
    if (firstItem.size) variations.push(firstItem.size);
    
    return {
      name: firstItem.name,
      variation: variations.join(' / '),
      details: firstItem.sku ? `SKU: ${firstItem.sku}` : ''
    };
  };

  const product = getProductDisplay();
  const totalWeight = order.line_items?.reduce((sum, item) => sum + (item.quantity * 750), 0) || 0; // Assuming 750g per item

  const handlePrintClick = () => {
    setShowPrintDialog(true);
  };

  const handlePrintComplete = () => {
    setShowPrintDialog(false);
    onPrint();
  };

  return (
    <>
      <Card className="mb-3 hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Checkbox and Order Number */}
            <div className="col-span-2 flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
              />
              <div>
                <div className="font-semibold text-sm">#{order.order_number}</div>
                <div className="text-xs text-muted-foreground">{order.customer_name}</div>
              </div>
            </div>

            {/* Products */}
            <div className="col-span-2">
              <div className="text-sm font-medium">{product.name}</div>
              {product.variation && (
                <div className="text-xs text-blue-600">{product.variation}</div>
              )}
            </div>

            {/* Details */}
            <div className="col-span-2">
              <div className="text-sm">{totalWeight}g</div>
              <div className="text-sm font-medium">{formatCurrency(order.total)}</div>
              <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
            </div>

            {/* Address */}
            <div className="col-span-4">
              <div className="text-sm">
                <div className="font-medium">{order.customer_name}</div>
                <div className="text-xs text-muted-foreground">
                  {order.shipping_address || 'Address not available'}
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    {order.customer_phone}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end">
              <Button
                onClick={handlePrintClick}
                size="sm"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Shipping Label - Order #{order.order_number}</DialogTitle>
          </DialogHeader>
          <PrintableLabel 
            order={order} 
            onPrint={handlePrintComplete}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
