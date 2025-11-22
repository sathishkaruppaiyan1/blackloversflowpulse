import React, { useState, useEffect, useRef } from 'react';
import { Truck, Scan, Package, MapPin, CheckCircle, XCircle, MessageCircle, Settings, ExternalLink, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { wooCommerceOrderService, type WooCommerceOrder } from '@/services/wooCommerceOrderService';
import { interaktService } from '@/services/interaktService';
import { detectCourierFromTracking, getCouriers } from '@/services/courierDetectionService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BulkMovementTrigger } from './BulkMovementTrigger';

const TrackingPage = () => {
  const [allOrders, setAllOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<WooCommerceOrder | null>(null);
  const [detectedCarrier, setDetectedCarrier] = useState<string>('');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const [isOrderLocked, setIsOrderLocked] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [shopifyStatus, setShopifyStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const { user } = useAuth();

  // Sound effect state
  const [soundEnabled, setSoundEnabled] = useState(true);

  const orderInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);

  // Sound effect functions
  const playSuccessSound = () => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  // Filter orders ready for tracking (packed orders)
  const trackingOrders = allOrders.filter(order => 
    order.status === 'packed'
  );
  

  // Fetch orders function
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const orders = await wooCommerceOrderService.fetchOrders();
      setAllOrders(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Load orders when component mounts and initialize services
  useEffect(() => {
    fetchOrders();
    if (user) {
      interaktService.initialize(user.id);
      loadCouriers();
    }
  }, [user]);

  // Load available couriers
  const loadCouriers = async () => {
    try {
      const couriers = await getCouriers();
      setAvailableCouriers(couriers);
    } catch (error) {
      console.error('Error loading couriers:', error);
    }
  };

  // Enhanced courier detection
  const detectCourierPartner = async (trackingNumber: string): Promise<string> => {
    const cleanInput = trackingNumber.trim();
    
    try {
      const detectedCourierName = await detectCourierFromTracking(cleanInput);
      
      if (detectedCourierName) {
        console.log(`🎯 Auto-detected courier: ${detectedCourierName} for tracking ${cleanInput}`);
        return detectedCourierName.toLowerCase().replace(/\s+/g, '');
      }
    } catch (error) {
      console.error('Error detecting courier:', error);
    }
    
    // Fallback to legacy detection
    const firstDigit = cleanInput.charAt(0);
    if (firstDigit === '4') {
      return 'frenchexpress';
    } else if (firstDigit === '2') {
      return 'delhivery';
    }
    
    return 'unknown';
  };

  // Helper function to get courier display name
  const getCourierDisplayName = (carrierCode: string): string => {
    const courier = availableCouriers.find(c => c.name.toLowerCase().replace(/\s+/g, '') === carrierCode);
    if (courier) return courier.name;
    
    // Fallback to legacy names
    switch (carrierCode) {
      case 'frenchexpress':
        return 'Franch Express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return 'Unknown';
    }
  };

  // Helper function to check if input looks like a tracking number
  const looksLikeTrackingNumber = (input: string) => {
    const cleanInput = input.trim();
    const trackingPatterns = [
      /^48\d{13}$/,        // Franch Express pattern
      /^2158\d{10}$/,      // Delhivery pattern
      /^[A-Z]{2}\d{9}[A-Z]{2}$/, // International tracking
      /^\d{10,22}$/,       // Generic numeric tracking (10-22 digits)
      /^[A-Z0-9]{8,30}$/   // Alphanumeric tracking codes
    ];
    
    return trackingPatterns.some(pattern => pattern.test(cleanInput));
  };

  // Helper function to check if input looks like an order ID
  const looksLikeOrderId = (input: string) => {
    const cleanInput = input.trim();
    return (
      cleanInput.startsWith('#') ||           // Order numbers with #
      /^[A-Z0-9]{1,10}$/.test(cleanInput) ||  // Short alphanumeric IDs
      /^\d{1,8}$/.test(cleanInput) ||         // Short numeric IDs
      cleanInput.includes('ORDER') ||         // Contains ORDER keyword
      cleanInput.includes('ORD')              // Contains ORD keyword
    );
  };

  // Enhanced focus management for order input
  useEffect(() => {
    if (!isOrderLocked && orderInputRef.current && !focusLocked && autoFocusEnabled) {
      orderInputRef.current.focus();
    }
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced focus management for tracking input
  useEffect(() => {
    if (isOrderLocked && trackingInputRef.current && !focusLocked && autoFocusEnabled) {
      trackingInputRef.current.focus();
    }
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced focus management with better button click detection
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const handleFocusManagement = () => {
      const activeElement = document.activeElement;
      
      // Check if user is interacting with any clickable element
      const isClickableElement = activeElement?.tagName === 'BUTTON' || 
                                activeElement?.getAttribute('role') === 'button' ||
                                activeElement?.tagName === 'A' ||
                                activeElement?.closest('[role="dialog"]') ||
                                activeElement?.closest('[data-dialog-content]') ||
                                activeElement?.closest('.manage-button') ||
                                activeElement?.closest('[data-radix-popper-content-wrapper]') ||
                                activeElement?.closest('[data-radix-dialog-content]');

      // Don't steal focus from clickable elements or dialog content
      if (isClickableElement) {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        // Re-enable auto-focus after a longer delay when user stops interacting
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 3000);
        return;
      }

      // Only refocus to scanner inputs if focus is lost and auto-focus is enabled
      if (autoFocusEnabled && !focusLocked) {
        if (!isOrderLocked && orderInputRef.current && activeElement !== orderInputRef.current) {
          orderInputRef.current.focus();
        } else if (isOrderLocked && trackingInputRef.current && activeElement !== trackingInputRef.current) {
          trackingInputRef.current.focus();
        }
      }
    };

    const interval = setInterval(handleFocusManagement, 500);
    return () => clearInterval(interval);
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced user interaction detection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Check if user clicked on any button or interactive element
      if (target?.closest('button') || 
          target?.closest('[role="button"]') ||
          target?.closest('a') ||
          target?.closest('[data-radix-popper-content-wrapper]') ||
          target?.closest('[data-radix-dialog-content]') ||
          target?.closest('.manage-button')) {
        
        // Don't disable auto-focus for scanner-specific buttons
        if (!target?.closest('.scanner-input')) {
          setFocusLocked(true);
          setAutoFocusEnabled(false);
          
          // Re-enable auto-focus after user stops interacting
          setTimeout(() => {
            setFocusLocked(false);
            setAutoFocusEnabled(true);
          }, 3000);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable auto-focus when user presses Tab or other navigation keys
      if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'F1' || e.key === 'F2') {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 2000);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOrderScan = () => {
    if (!orderIdInput.trim()) return;
    
    const cleanInput = orderIdInput.trim();
    
    // Check if input looks like a tracking number instead of order ID
    if (looksLikeTrackingNumber(cleanInput)) {
      playErrorSound();
      toast.error("This looks like a tracking number, not an order ID. Please scan the order barcode first.");
      setOrderIdInput('');
      return;
    }

    // Find order by order number or ID
    const order = trackingOrders.find(o => 
      o.order_number === cleanInput || 
      o.id === cleanInput ||
      o.order_number === `#${cleanInput}` ||
      o.order_number.replace('#', '') === cleanInput
    );

    if (order) {
      playSuccessSound();
      setCurrentOrder(order);
      setIsOrderLocked(true);
      setWhatsappStatus(null);
      setShopifyStatus(null);
      toast.success(`Order ${order.order_number} loaded successfully`);
      console.log('Order found:', order.order_number);
      console.log('Customer phone:', order.customer_phone);
    } else {
      playErrorSound();
      toast.error("Order not found in tracking queue");
      setCurrentOrder(null);
      setIsOrderLocked(false);
    }
  };

  const handleTrackingNumberScan = async () => {
    if (!trackingNumberInput.trim() || !currentOrder) return;
    
    const trackingNumber = trackingNumberInput.trim();
    
    // Check if input looks like an order ID instead of tracking number
    if (looksLikeOrderId(trackingNumber)) {
      playErrorSound();
      toast.error("This looks like an order ID, not a tracking number. Please scan the tracking barcode.");
      setTrackingNumberInput('');
      return;
    }

    // Use selected carrier or detected carrier
    const carrier = selectedCarrier || detectedCarrier || 'unknown';
    
    let carrierDisplayName = '';
    switch (carrier) {
      case 'frenchexpress':
        carrierDisplayName = 'Franch Express';
        break;
      case 'delhivery':
        carrierDisplayName = 'Delhivery';
        break;
      default:
        carrierDisplayName = 'Unknown';
    }
    
    setWhatsappStatus('pending');
    setShopifyStatus('pending');
    
    try {
      console.log('🚀 Starting tracking update process...');
      
      // Update tracking information using WooCommerce service (this updates status immediately)
      await wooCommerceOrderService.updateTracking(currentOrder.id, trackingNumber, carrier);
      
      // Update status immediately - don't wait for WhatsApp
      setShopifyStatus('success');
      console.log('✅ Order updated successfully');
      
      // Play success sound immediately
      playSuccessSound();
      
      // Refresh orders to show updated status immediately
      await fetchOrders();
      
      // Prepare tracking data for WhatsApp notifications
      const trackingData = {
        orderNumber: currentOrder.order_number,
        customerName: currentOrder.customer_name,
        trackingNumber: trackingNumber,
        carrier: carrier,
        orderValue: String(currentOrder.total || '0'),
        shippingAddress: currentOrder.shipping_address || 'No address provided',
        resellerName: currentOrder.reseller_name
      };

      // Send WhatsApp notifications asynchronously in the background (fire and forget)
      if (interaktService.isActive()) {
        // Send to customer automatically (always send if phone available)
        if (currentOrder.customer_phone) {
          console.log('📱 Sending tracking update to customer via Interakt (background)...');
          interaktService.sendTrackingUpdateToCustomer(
            trackingData,
            currentOrder.customer_phone
          ).then((customerSuccess) => {
            if (customerSuccess) {
              console.log('✅ Tracking notification sent to customer successfully');
              setWhatsappStatus('success');
            } else {
              console.log('❌ Failed to send tracking notification to customer');
              setWhatsappStatus('failed');
            }
          }).catch((error) => {
            console.error('Error sending customer notification:', error);
            setWhatsappStatus('failed');
          });
        }

        // Send to reseller if details are available (background)
        if (currentOrder.reseller_number && currentOrder.reseller_name) {
          console.log('📱 Sending tracking update to reseller via Interakt (background)...');
          interaktService.sendTrackingUpdateToReseller(
            trackingData,
            currentOrder.reseller_number,
            currentOrder.reseller_name
          ).then((resellerSuccess) => {
            if (resellerSuccess) {
              console.log('✅ Tracking notification sent to reseller successfully');
            } else {
              console.log('❌ Failed to send tracking notification to reseller');
            }
          }).catch((error) => {
            console.error('Error sending reseller notification:', error);
          });
        }
      } else {
        setWhatsappStatus('failed');
        console.log('❌ Interakt not configured or disabled');
      }
      
      // Reset form after successful update
      setOrderIdInput('');
      setTrackingNumberInput('');
      setCurrentOrder(null);
      setDetectedCarrier('');
      setSelectedCarrier('');
      setIsOrderLocked(false);
      
        toast.success(`Tracking number ${trackingNumber} added for order ${currentOrder.order_number}`);
      
      // Reset status indicators after a delay
      setTimeout(() => {
        setWhatsappStatus(null);
        setShopifyStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error updating tracking:', error);
      playErrorSound();
      setWhatsappStatus('failed');
      setShopifyStatus('failed');
      toast.error("Failed to update tracking information");
    }
  };

  const handleResetOrder = () => {
    setOrderIdInput('');
    setTrackingNumberInput('');
    setCurrentOrder(null);
    setDetectedCarrier('');
    setSelectedCarrier('');
    setIsOrderLocked(false);
    setWhatsappStatus(null);
    setShopifyStatus(null);
    setFocusLocked(false);
    setAutoFocusEnabled(true);
  };

  // Handle individual order selection
  const handleOrderSelect = (orderId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedOrderIds);
    if (checked) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    setSelectedOrderIds(newSelectedIds);
    setSelectAll(newSelectedIds.size === trackingOrders.length);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(trackingOrders.map(order => order.id));
      setSelectedOrderIds(allIds);
      setSelectAll(true);
    } else {
      setSelectedOrderIds(new Set());
      setSelectAll(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-poppins">Tracking Stage</h1>
            <p className="text-muted-foreground">Loading tracking queue...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Loading tracking queue...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-poppins">Tracking Stage</h1>
          <p className="text-muted-foreground">Assign tracking numbers to packed orders</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Sound Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center space-x-2"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tracking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready for Tracking</p>
                <p className="text-2xl font-bold text-blue-600">{trackingOrders.length}</p>
                <p className="text-xs text-muted-foreground">Packed orders</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders Shipped</p>
                <p className="text-2xl font-bold text-green-600">
                  {allOrders.filter(o => o.status === 'shipped').length}
                </p>
                <p className="text-xs text-muted-foreground">With tracking</p>
              </div>
              <Truck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selected Orders</p>
                <p className="text-2xl font-bold text-purple-600">{selectedOrderIds.size}</p>
                <p className="text-xs text-muted-foreground">For bulk actions</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Order</p>
                <p className="text-2xl font-bold text-orange-600">
                  {currentOrder ? '1' : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Locked for tracking</p>
              </div>
              <Scan className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Indicators */}
      {(whatsappStatus || shopifyStatus) && (
        <div className="space-y-3">
          {/* WhatsApp Status */}
          {whatsappStatus && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">WhatsApp Notification</span>
                      {whatsappStatus === 'pending' && (
                                                  <Badge className="bg-yellow-100 text-yellow-800">
                            Sending...
                          </Badge>
                      )}
                      {whatsappStatus === 'success' && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Badge className="bg-green-100 text-green-800">
                            Sent Successfully
                          </Badge>
                        </div>
                      )}
                      {whatsappStatus === 'failed' && (
                        <div className="flex items-center space-x-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <Badge className="bg-red-100 text-red-800">
                            Failed to Send
                          </Badge>
                        </div>
                      )}
                    </div>
                    {whatsappStatus === 'success' && (
                      <p className="text-sm text-green-600 mt-1">
                        Customer has been automatically notified about the shipment via WhatsApp
                      </p>
                    )}
                    {whatsappStatus === 'failed' && (
                      <p className="text-sm text-red-600 mt-1">
                        Could not send WhatsApp notification - check customer phone number
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          {shopifyStatus && (
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <ExternalLink className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">WooCommerce Order Update</span>
                      {shopifyStatus === 'pending' && (
                                                  <Badge className="bg-yellow-100 text-yellow-800">
                            Updating...
                          </Badge>
                      )}
                      {shopifyStatus === 'success' && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Badge className="bg-green-100 text-green-800">
                            Updated Successfully
                          </Badge>
                        </div>
                      )}
                      {shopifyStatus === 'failed' && (
                        <div className="flex items-center space-x-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <Badge className="bg-red-100 text-red-800">
                            Update Failed
                          </Badge>
                        </div>
                      )}
                    </div>
                    {shopifyStatus === 'success' && (
                      <p className="text-sm text-green-600 mt-1">
                        Order has been updated with tracking details in the system
                      </p>
                    )}
                    {shopifyStatus === 'failed' && (
                      <p className="text-sm text-red-600 mt-1">
                        Could not update order - please try again
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Tracking Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Tracking Assignment Scanner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scan className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">Tracking Assignment Scanner</CardTitle>
              </div>
              {isOrderLocked && (
                <Button
                  onClick={handleResetOrder}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 scanner-input"
                >
                  Reset
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Scan order ID first, then scan tracking number barcode (auto-sends notifications)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Order ID Scanner */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Order ID Scanner</label>
              <div className="flex space-x-2">
              <Input
                  ref={orderInputRef}
                  placeholder="Scan or enter Order ID (not tracking number)"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isOrderLocked && handleOrderScan()}
                  onFocus={() => {
                    setFocusLocked(false);
                    setAutoFocusEnabled(true);
                  }}
                  className="flex-1"
                  disabled={isOrderLocked}
                  autoFocus
              />
              <Button 
                  onClick={handleOrderScan}
                  size="sm"
                  variant="outline"
                  className="px-3 scanner-input"
                  disabled={isOrderLocked || !orderIdInput.trim()}
                >
                  <Scan className="h-4 w-4" />
              </Button>
            </div>
              {isOrderLocked && currentOrder && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Order {currentOrder.order_number} locked and ready
                </p>
              )}
              </div>

            {/* Tracking Number Scanner - Only show when order is selected */}
            {isOrderLocked && currentOrder && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Tracking Number Scanner</label>
                <div className="flex space-x-2">
                  <Input
                    ref={trackingInputRef}
                    placeholder="Scan tracking number barcode (not order ID)"
                    value={trackingNumberInput}
                    onChange={async (e) => {
                      setTrackingNumberInput(e.target.value);
                      if (e.target.value.length > 8) {
                        const carrier = await detectCourierPartner(e.target.value);
                        setDetectedCarrier(carrier);
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleTrackingNumberScan()}
                    onFocus={() => {
                      setFocusLocked(false);
                      setAutoFocusEnabled(true);
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button 
                    onClick={handleTrackingNumberScan}
                    size="sm"
                    variant="default"
                    className="px-3 scanner-input"
                    disabled={!trackingNumberInput.trim()}
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </div>

                {/* Carrier Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Courier Partner</label>
                  <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder={detectedCarrier ? getCourierDisplayName(detectedCarrier) : "Select courier partner"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCouriers.length > 0 ? (
                        availableCouriers.map((courier) => (
                          <SelectItem key={courier.id} value={courier.name.toLowerCase().replace(/\s+/g, '')}>
                            {courier.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="frenchexpress">Franch Express</SelectItem>
                          <SelectItem value="delhivery">Delhivery</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {detectedCarrier && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">
                        🎯 Auto-detected: {getCourierDisplayName(detectedCarrier)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Order Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Order Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {currentOrder ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{currentOrder.order_number}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Locked
                  </span>
                </div>
                
                <div>
                  <p className="font-medium">{currentOrder.customer_name}</p>
                  <p className="text-sm text-gray-600">{currentOrder.customer_email}</p>
                  {currentOrder.customer_phone ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-600 font-medium">WhatsApp: {currentOrder.customer_phone}</p>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 mt-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-600 font-medium">No phone number - WhatsApp unavailable</p>
                    </div>
                  )}
              </div>

                {/* Reseller Information Section */}
                {(currentOrder.reseller_name || currentOrder.reseller_number) && (
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Reseller Details</span>
                    </div>
                    {currentOrder.reseller_name && (
                      <p className="font-medium text-blue-900">{currentOrder.reseller_name}</p>
                    )}
                    {currentOrder.reseller_number ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-600 font-medium">
                          WhatsApp: {currentOrder.reseller_number}
                        </p>
                      </div>
                    ) : (
                      currentOrder.reseller_name && (
                        <div className="flex items-center space-x-2 mt-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-600 font-medium">No reseller phone - WhatsApp unavailable</p>
                        </div>
                      )
                    )}
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">
                        📱 Tracking notifications will be sent to this reseller
                      </p>
                    </div>
                  </div>
                )}

                {currentOrder.shipping_address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p>{currentOrder.shipping_address}</p>
                  </div>
                </div>
              )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="font-semibold">{currentOrder.items || currentOrder.line_items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-semibold">{formatCurrency(currentOrder.total)}</p>
                  </div>
                </div>

                {(detectedCarrier || selectedCarrier) && trackingNumberInput && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Ready to Add</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>Tracking Number:</strong> {trackingNumberInput}</p>
                      <p><strong>Courier:</strong> {getCourierDisplayName(selectedCarrier || detectedCarrier)}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        📱 WhatsApp notification will be sent to reseller when you add tracking
                      </p>
                      <p className="text-xs text-blue-600">
                        🔄 Order will be moved to shipped status automatically
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Scan className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No order selected</p>
                <p className="text-sm text-gray-500 mt-1">
                  Scan an order ID to view details
                </p>
              </div>
            )}
            </CardContent>
          </Card>
      </div>

      {/* Orders Ready for Tracking - Full Width List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">Orders Ready for Tracking</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {/* Bulk Selection Controls */}
              {trackingOrders.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-gray-600">
                      {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} selected` : 'Select all'}
                    </span>
                  </div>
                  
                  {/* NEW: Bulk Movement Trigger - only shows when orders are selected */}
                  <BulkMovementTrigger
                    selectedOrderIds={Array.from(selectedOrderIds)}
                    selectedOrders={trackingOrders.filter(order => selectedOrderIds.has(order.id))}
                    currentStage="packed"
                    onSuccess={fetchOrders}
                    variant="small"
                  />
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {trackingOrders.length} orders waiting for tracking numbers
          </p>
        </CardHeader>
        <CardContent>
          {trackingOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Orders Ready</h3>
              <p className="text-muted-foreground">
                No orders are currently ready for tracking assignment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackingOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                    />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">#{order.order_number}</h4>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          • {order.items || order.line_items?.length || 0} items
                        </div>
                        <div className="text-sm text-muted-foreground">
                          • {formatCurrency(order.total)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                          • {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="text-xs">Ready</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackingPage;
