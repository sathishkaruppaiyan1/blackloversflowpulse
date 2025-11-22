import React, { useState, useEffect } from 'react';
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
import { detectCourierFromTracking, getCouriers } from '@/services/courierDetectionService';

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
  const [detectedCourier, setDetectedCourier] = useState<string>('');
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const { sendResellerTrackingNotification, isActive: isInteraktActive } = useInteraktIntegration();
  const { storeCompletedOrder } = useCompletedOrders();

  // Load available couriers on component mount
  useEffect(() => {
    const loadCouriers = async () => {
      try {
        const couriers = await getCouriers();
        setAvailableCouriers(couriers);
      } catch (error) {
        console.error('Error loading couriers:', error);
      }
    };
    loadCouriers();
  }, []);

  // Detect courier when tracking number changes
  useEffect(() => {
    const detectCourier = async () => {
      if (trackingNumber.trim().length > 5) {
        try {
          const detected = await detectCourierFromTracking(trackingNumber.trim());
          if (detected) {
            setDetectedCourier(detected);
            // Auto-select the detected carrier
            const carrierCode = getCarrierCode(detected);
            setCarrier(carrierCode);
          }
        } catch (error) {
          console.error('Error detecting courier:', error);
        }
      } else {
        setDetectedCourier('');
      }
    };
    detectCourier();
  }, [trackingNumber]);

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

      // Show success immediately
      toast.success('Tracking updated and order data stored successfully!');

      // Send WhatsApp notifications asynchronously in the background (fire and forget)
      if (isInteraktActive) {
        // Always send to customer if phone available
        if (customerPhone && customerPhone !== 'N/A') {
          console.log(`📱 Sending WhatsApp notification to customer (background)...`);
          const { interaktService } = await import('@/services/interaktService');
          const trackingData = {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            trackingNumber: trackingNumber.trim(),
            carrier: carrierCode,
            orderValue: String(order.total || '0'),
            shippingAddress: order.shipping_address || 'No address provided',
            resellerName: order.reseller_name,
            customerPhone: customerPhone,
            productName: productName,
            productVariant: productVariant
          };
          
          interaktService.sendTrackingUpdateToCustomer(
            trackingData,
            customerPhone
          ).then((success) => {
            if (success) {
              console.log('✅ Customer tracking notification sent successfully');
            } else {
              console.log('❌ Failed to send customer tracking notification');
            }
          }).catch((error) => {
            console.error('Error sending customer notification:', error);
          });
        }

        // Send to reseller if details are available (background)
        if (order.reseller_name && order.reseller_number) {
          console.log(`📱 Sending WhatsApp notification to reseller (background): ${order.reseller_name} at ${order.reseller_number}`);
          sendResellerTrackingNotification(
            order.order_number,
            order.customer_name,
            trackingNumber.trim(),
            carrierCode,
            order.total,
            order.shipping_address || '',
            order.reseller_name,
            order.reseller_number,
            customerPhone,
            productName,
            productVariant
          ).then((resellerSuccess) => {
            if (resellerSuccess) {
              console.log('✅ Reseller tracking notification sent successfully');
            } else {
              console.log('❌ Failed to send reseller tracking notification');
            }
          }).catch((error) => {
            console.error('Error sending reseller notification:', error);
          });
        }
      }

      onTrackingUpdated(updatedOrder);
      
      // Clear form
      setTrackingNumber('');
      setCarrier('');
      setDetectedCourier('');
      
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
                      <SelectItem key={courierOption.id} value={getCarrierCode(courierOption.name)}>
                        {courierOption.name}
                      </SelectItem>
                    ))
                  ) : (
                    // Fallback to static list if no couriers configured
                    <>
                      <SelectItem value="frenchexpress">Franch Express</SelectItem>
                      <SelectItem value="delhivery">Delhivery</SelectItem>
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
