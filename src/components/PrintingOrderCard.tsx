
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Printer, MapPin, Phone, Mail, Calendar, Weight, DollarSign } from 'lucide-react';
import { WooCommerceOrder } from '@/services/wooCommerceOrderService';
import PackingSlipTemplate from './PackingSlipTemplate';

interface PrintingOrderCardProps {
  order: WooCommerceOrder;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPrint: () => void;
}

const PrintingOrderCard: React.FC<PrintingOrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  onPrint,
}) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAddress = (address?: string) => {
    if (!address) return ['No address provided'];
    return address.split(',').map(line => line.trim());
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
    
    // Check meta_data for additional variations
    if (item.meta_data && Array.isArray(item.meta_data)) {
      item.meta_data.forEach((meta: any) => {
        if (meta.display_key && meta.display_value) {
          variations.push(`${meta.display_key}: ${meta.display_value}`);
        }
      });
    }
    
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
          <div className="col-span-3">
            <div className="space-y-2">
              {order.line_items?.map((item: any, index: number) => (
                <div key={index} className="text-xs">
                  <div className="font-bold text-gray-900 text-sm">
                    ₹{(item.total || item.price || 0).toFixed(2)}
                  </div>
                  <div className="font-bold text-gray-800 truncate">
                    {item.name || 'Product Name'}
                  </div>
                  <div className="text-gray-600">
                    Qty: {item.quantity || 1} • {getVariationDisplay(item)}
                  </div>
                </div>
              ))}
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
          <div className="col-span-5">
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 text-gray-500 flex-shrink-0" />
                <div className="text-gray-700 leading-tight">
                  {formatAddress(order.shipping_address).map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-600 font-medium">{order.customer_phone}</span>
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
          <div className="col-span-2 flex items-center justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="text-xs px-3 py-1 h-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <PackingSlipTemplate
                  order={order}
                  showPrintButton={true}
                  onPrint={onPrint}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingOrderCard;
