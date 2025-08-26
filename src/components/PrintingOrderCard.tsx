
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Printer, Package, MapPin, Phone, Mail, Calendar, Weight, DollarSign } from 'lucide-react';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';
import PrintableLabel from './PrintableLabel';

interface PrintingOrderCardProps {
  order: WooCommerceOrder;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPrint: () => void;
  onMoveToPacking: () => void;
}

const PrintingOrderCard: React.FC<PrintingOrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  onPrint,
  onMoveToPacking,
}) => {
  const [labelFormat, setLabelFormat] = useState<'A4' | 'A5'>('A4');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAddress = (address?: string) => {
    if (!address) return 'No address provided';
    return address.length > 80 ? `${address.substring(0, 80)}...` : address;
  };

  const calculateTotalWeight = () => {
    return order.line_items?.reduce((total, item) => {
      return total + (parseFloat(item.weight || '0.5') * (item.quantity || 1));
    }, 0).toFixed(1) || '0.5';
  };

  const getVariationDisplay = (item: any) => {
    const variations = [];
    if (item.size) variations.push(`Size: ${item.size}`);
    if (item.color) variations.push(`Color: ${item.color}`);
    if (item.weight) variations.push(`Weight: ${item.weight}kg`);
    return variations.length > 0 ? variations.join(', ') : 'Standard';
  };

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="p-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Checkbox + Order Number + Customer */}
          <div className="col-span-2 flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 text-sm">#{order.order_number}</div>
              <div className="text-xs text-gray-600 truncate">{order.customer_name}</div>
              <Badge variant="secondary" className="text-xs mt-1">
                {order.items} item{order.items !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          {/* Product Details */}
          <div className="col-span-2">
            <div className="space-y-1">
              {order.line_items?.slice(0, 2).map((item: any, index: number) => (
                <div key={index} className="text-xs">
                  <div className="font-medium text-gray-800 truncate">
                    {item.name || 'Product Name'}
                  </div>
                  <div className="text-gray-600">
                    Qty: {item.quantity || 1} • {getVariationDisplay(item)}
                  </div>
                </div>
              ))}
              {order.line_items && order.line_items.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{order.line_items.length - 2} more items
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="col-span-2">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-gray-600">
                <Weight className="h-3 w-3" />
                <span>{calculateTotalWeight()} kg</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <DollarSign className="h-3 w-3" />
                <span>₹{order.total.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address + Contact */}
          <div className="col-span-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 leading-tight">
                  {formatAddress(order.shipping_address)}
                </span>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone className="h-3 w-3" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{order.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-2 flex items-center justify-end gap-2">
            <div className="flex items-center gap-1">
              <select
                value={labelFormat}
                onChange={(e) => setLabelFormat(e.target.value as 'A4' | 'A5')}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </select>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <PrintableLabel
                  order={order}
                  format={labelFormat}
                  onPrint={onPrint}
                />
              </DialogContent>
            </Dialog>

            <Button
              size="sm"
              onClick={onMoveToPacking}
              className="text-xs px-2 py-1 h-auto bg-green-600 hover:bg-green-700"
            >
              <Package className="h-3 w-3 mr-1" />
              Pack
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingOrderCard;
