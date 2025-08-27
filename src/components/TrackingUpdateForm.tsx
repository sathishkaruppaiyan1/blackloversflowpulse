
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Send, User, Phone } from 'lucide-react';
import { wooCommerceOrderService, WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { useInteraktIntegration } from '@/hooks/useInteraktIntegration';
import { useCompletedOrders } from '@/hooks/useCompletedOrders';

interface TrackingUpdateFormProps {
  order: WooCommerceOrder;
  onTrackingUpdated: (updatedOrder: WooCommerceOrder) => void;
}

const CARRIERS = [
  'Franch Express',
  'Delhivery'
];

// Helper function to convert display names to carrier codes
const getCarrierCode = (displayName: string): string => {
  switch (displayName) {
    case 'Franch Express':
      return 'frenchexpress';
    case 'Delhivery':
      return 'delhivery';
    default:
      return displayName.toLowerCase().replace(/\s+/g, '');
  }
};

const TrackingUpdateForm: React.FC<TrackingUpdateFormProps> = ({ order, onTrackingUpdated }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [updating, setUpdating] = useState(false);
  const { sendResellerTrackingNotification, isActive: isInteraktActive } = useInteraktIntegration();
  const { storeCompletedOrder } = useCompletedOrders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingNumber.trim() || !carrier.trim()) {
      toast.error('Please enter both tracking number and carrier');
      return;
    }

    setUpdating(true);
    try {
      console.log(`🚀 Updating tracking for order ${order.order_number}`);
      
      // Update tracking in database
      const carrierCode = getCarrierCode(carrier.trim());
      const updatedOrder = await wooCommerceOrderService.updateTracking(
        order.id,
        trackingNumber.trim(),
        carrierCode
      );

      // Always store completed order data when tracking is updated
      try {
        console.log(`📦 Storing completed order data for ${updatedOrder.order_number}...`);
        await storeCompletedOrder(updatedOrder);
        console.log(`✅ Successfully stored completed order data for ${updatedOrder.order_number}`);
      } catch (storeError) {
        console.error('Error storing completed order data:', storeError);
        // Don't fail the main operation if storing fails, but log it
        toast.error('Tracking updated but failed to store order data for future reference');
      }

      // Extract proper customer phone and product details from order
      let customerPhone = order.customer_phone || 'N/A';
      let productName = 'Product';
      let productVariant = 'Standard';
      
      // Extract product details from line_items if available
      if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
        const firstItem = order.line_items[0];
        if (firstItem.name) {
          productName = firstItem.name;
        }
        
        // Build variant from color, size, or other attributes
        const variantParts = [];
        if (firstItem.color) variantParts.push(firstItem.color);
        if (firstItem.size) variantParts.push(firstItem.size);
        
        if (variantParts.length > 0) {
          productVariant = variantParts.join(' - ');
        }
      }

      // Send WhatsApp notification only to reseller if configured and reseller details available
      if (isInteraktActive && order.reseller_name && order.reseller_number) {
        console.log(`📱 Sending WhatsApp notification to reseller: ${order.reseller_name} at ${order.reseller_number}`);
        console.log(`📱 Using customer phone: ${customerPhone}, product: ${productName}, variant: ${productVariant}`);
        
        const resellerSuccess = await sendResellerTrackingNotification(
          order.order_number,
          order.customer_name,
          trackingNumber.trim(),
          carrierCode,
          order.total,
          order.shipping_address || '',
          order.reseller_name,
          order.reseller_number,
          customerPhone, // Pass the proper customer phone
          productName,   // Pass the proper product name
          productVariant // Pass the proper product variant
        );

        if (resellerSuccess) {
          toast.success('Tracking updated, order data stored, and WhatsApp notification sent to reseller!');
        } else {
          toast.success('Tracking updated and order data stored. Failed to send WhatsApp notification to reseller.');
        }
      } else if (!isInteraktActive) {
        toast.success('Tracking updated and order data stored. Configure Interakt settings to enable WhatsApp notifications.');
      } else if (!order.reseller_name || !order.reseller_number) {
        toast.success('Tracking updated and order data stored. No reseller details available for WhatsApp notification.');
      } else {
        toast.success('Tracking updated and order data stored successfully!');
      }

      onTrackingUpdated(updatedOrder);
      
      // Clear form
      setTrackingNumber('');
      setCarrier('');
      
    } catch (error: any) {
      console.error('Error updating tracking:', error);
      toast.error('Failed to update tracking information');
    } finally {
      setUpdating(false);
    }
  };

  const getNotificationInfo = () => {
    if (!isInteraktActive) {
      return {
        icon: <Package className="h-4 w-4" />,
        text: 'Configure Interakt for WhatsApp notifications',
        className: 'text-gray-500'
      };
    }

    const hasResellerDetails = order.reseller_name && order.reseller_number;

    if (hasResellerDetails) {
      return {
        icon: <Send className="h-4 w-4" />,
        text: 'WhatsApp notification will be sent to reseller',
        className: 'text-blue-600'
      };
    }

    return {
      icon: <Package className="h-4 w-4" />,
      text: 'No reseller details available for WhatsApp notifications',
      className: 'text-amber-600'
    };
  };

  const notificationInfo = getNotificationInfo();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <CardTitle>Update Tracking Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Order and Reseller Information Section */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">Order & Reseller Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Order Number:</strong> {order.order_number}</p>
              <p><strong>Customer:</strong> {order.customer_name}</p>
              <p><strong>Status:</strong> {order.status}</p>
            </div>
            <div>
              {order.reseller_name ? (
                <>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4 text-green-600" />
                    <span><strong>Reseller:</strong> {order.reseller_name}</span>
                  </div>
                  {order.reseller_number && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span><strong>Phone:</strong> {order.reseller_number}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">No reseller assigned</p>
              )}
            </div>
          </div>
          
          {/* Storage Notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                Order data will be automatically stored for future reference when tracking is updated
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                type="text"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
              />
              {detectedCourier && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    🎯 Auto-detected: <strong>{detectedCourier}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">Courier Service</Label>
              <Select value={carrier} onValueChange={setCarrier} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select courier service" />
                </SelectTrigger>
                <SelectContent>
                  {availableCouriers.length > 0 ? (
                    availableCouriers.map((courierOption) => (
                      <SelectItem key={courierOption.id} value={courierOption.name}>
                        {courierOption.name}
                      </SelectItem>
                    ))
                  ) : (
                    // Fallback to static list if no couriers configured
                    <>
                      <SelectItem value="Franch Express">Franch Express</SelectItem>
                      <SelectItem value="Delhivery">Delhivery</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm">
              <div className={`flex items-center space-x-1 ${notificationInfo.className}`}>
                {notificationInfo.icon}
                <span>{notificationInfo.text}</span>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={updating}
              className="flex items-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>{updating ? 'Updating...' : 'Update Tracking'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TrackingUpdateForm;
