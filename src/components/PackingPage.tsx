import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Scan, Search, CheckCircle, AlertCircle, Box, RefreshCw, Clock, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { wooCommerceOrderService, type WooCommerceOrder } from "@/services/wooCommerceOrderService";
import { Progress } from "@/components/ui/progress";
import { BulkMovementTrigger } from "./BulkMovementTrigger";

interface ScannedProduct {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  scanned: boolean;
  packed: boolean;
}

export const PackingPage = () => {
  const [scannedOrderId, setScannedOrderId] = useState("");
  const [currentOrder, setCurrentOrder] = useState<WooCommerceOrder | null>(null);
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [productSku, setProductSku] = useState("");
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [allOrders, setAllOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [packingProgress, setPackingProgress] = useState({ packed: 0, total: 0, percentage: 0 });
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const orderScannerRef = useRef<HTMLInputElement>(null);

  // Filter orders by stages using the enhanced service
  const packingOrders = allOrders.filter(order => 
    order.status === 'packing' || order.status === 'printed'
  );

  // Get other stage orders for metrics
  const trackingOrders = allOrders.filter(order => order.status === 'packed');
  const shippedOrders = allOrders.filter(order => order.status === 'shipped');
  const deliveredOrders = allOrders.filter(order => order.status === 'delivered');
  const printingOrders = allOrders.filter(order => order.status === 'processing');

  // NEW: Sound effect functions
  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Sound not available');
    }
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Sound not available');
    }
  };

  // Fetch orders function
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const orders = await wooCommerceOrderService.fetchOrders();
      setAllOrders(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderScan = async () => {
    if (!scannedOrderId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an order ID or number",
        variant: "destructive",
      });
      playErrorSound();
      return;
    }

    // Find the order by ID or order number from packingOrders specifically
    const order = packingOrders.find(o => 
      o.id === scannedOrderId || 
      o.order_number === scannedOrderId ||
      o.order_number.replace('#', '') === scannedOrderId
    );

    if (order) {
      setCurrentOrder(order);
      
      // Initialize scanned products from order line items with enhanced tracking
      const products: ScannedProduct[] = order.line_items?.map(item => ({
        id: item.id.toString(),
        sku: item.sku || `PROD-${item.product_id}`,
        name: item.name,
        quantity: item.quantity,
        scanned: false,
        packed: item.packed || false
      })) || [];

      setScannedProducts(products);

      // Get and update packing progress
      try {
        const progress = await wooCommerceOrderService.getPackingProgress(order.id);
        setPackingProgress(progress);
      } catch (error) {
        console.error('Error getting packing progress:', error);
      }
      
      // NEW: Play success sound for order scan
      playSuccessSound();
      
      toast({
        title: "Order Loaded",
        description: `Order #${order.order_number} loaded successfully`,
      });

      setScannedOrderId("");
      setTimeout(() => {
        const scannerInput = document.getElementById('product-scanner') as HTMLInputElement;
        if (scannerInput) {
          scannerInput.focus();
        }
      }, 100);
    } else {
      // NEW: Play error sound for failed order scan
      playErrorSound();
      toast({
        title: "Order Not Found",
        description: "No packing order found with the provided ID or number",
        variant: "destructive",
      });
    }
  };

  const handleProductScan = async () => {
    if (!productSku.trim()) {
      toast({
        title: "Error",
        description: "Please enter SKU, product name, or scan barcode",
        variant: "destructive",
      });
      playErrorSound();
      return;
    }

    if (!currentOrder) {
      toast({
        title: "Error",
        description: "No order selected",
        variant: "destructive",
      });
      playErrorSound();
      return;
    }

    const searchTerm = productSku.toLowerCase().trim();

    // Enhanced matching - search by SKU, name, or partial matches
    const productIndex = scannedProducts.findIndex(p => 
      p.sku.toLowerCase() === searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(p.sku.toLowerCase()) ||
      // Also try matching without special characters
      p.sku.toLowerCase().replace(/[^a-z0-9]/g, '') === searchTerm.replace(/[^a-z0-9]/g, '') ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(searchTerm.replace(/[^a-z0-9]/g, ''))
    );

    if (productIndex !== -1) {
      const matchedProduct = scannedProducts[productIndex];
      const updatedProducts = [...scannedProducts];
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        scanned: true,
        packed: true
      };
      setScannedProducts(updatedProducts);

      // Update the specific item in the database
      try {
        await wooCommerceOrderService.updateOrderItemPacked(
          currentOrder.id, 
          updatedProducts[productIndex].id, 
          true
        );

        // Update packing progress
        const progress = await wooCommerceOrderService.getPackingProgress(currentOrder.id);
        setPackingProgress(progress);

        // NEW: Play success sound for product scan
        playSuccessSound();

        toast({
          title: "Product Packed",
          description: `${matchedProduct.name} (${matchedProduct.sku}) scanned and marked as packed`,
        });

        // Check if all products are now scanned - if so, auto-complete packing
        const allProductsScanned = updatedProducts.every(p => p.scanned);
        if (allProductsScanned) {
          // Auto-complete packing without requiring button click
          setTimeout(async () => {
            try {
              // Update order stage to 'packed' (ready for tracking stage)
              await wooCommerceOrderService.updateOrderStage(currentOrder.id, 'packed');
              
              // Refresh orders to show updated status
              await fetchOrders();

              toast({
                title: "Packing Complete! 🎉",
                description: `Order #${currentOrder.order_number} automatically moved to tracking stage`,
              });

              // Reset state - order will automatically disappear from packing list
              setCurrentOrder(null);
              setScannedProducts([]);
              setPackingProgress({ packed: 0, total: 0, percentage: 0 });
              setScannedOrderId("");

              // Focus back to order scanner for next order
              setTimeout(() => {
                if (orderScannerRef.current) {
                  orderScannerRef.current.focus();
                }
              }, 100);
            } catch (error) {
              console.error('Error auto-completing packing:', error);
              toast({
                title: "Error",
                description: "Failed to complete packing automatically",
                variant: "destructive",
              });
            }
          }, 1000); // Small delay to show the final product scan confirmation
          return; // Exit early since we're auto-completing
        }

      } catch (error) {
        console.error('Error updating item packed status:', error);
        toast({
          title: "Error",
          description: "Failed to update packed status",
          variant: "destructive",
        });
      }

      // Clear input and focus back for next scan (only if not auto-completing)
      setProductSku("");
      setProductName("");
      setProductQuantity(1);
      
      // Auto-focus back to scanner for quick consecutive scans
      setTimeout(() => {
        const scannerInput = document.getElementById('product-scanner') as HTMLInputElement;
        if (scannerInput) {
          scannerInput.focus();
        }
      }, 100);
    } else {
      // NEW: Play error sound for product not found
      playErrorSound();
      toast({
        title: "Product Not Found",
        description: `No matching product found for "${productSku}"`,
        variant: "destructive",
      });
    }
  };

  const handleClearProductInput = () => {
    setProductSku("");
    setProductName("");
    setProductQuantity(1);
    
    // Focus back to scanner
    setTimeout(() => {
      const scannerInput = document.getElementById('product-scanner') as HTMLInputElement;
      if (scannerInput) {
        scannerInput.focus();
      }
    }, 100);
  };

  const handleCompletePacking = async () => {
    if (!currentOrder) return;

    const allScanned = scannedProducts.every(p => p.scanned);
    if (!allScanned) {
      toast({
        title: "Incomplete Packing",
        description: "Please scan all products before completing",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update order stage to 'packed' (ready for tracking stage)
      await wooCommerceOrderService.updateOrderStage(currentOrder.id, 'packed');
      
      // Refresh orders to show updated status
      await fetchOrders();

      toast({
        title: "Packing Complete",
        description: `Order #${currentOrder.order_number} packed and moved to tracking stage`,
      });

      // Reset state - order will automatically disappear from packing list
      setCurrentOrder(null);
      setScannedProducts([]);
      setPackingProgress({ packed: 0, total: 0, percentage: 0 });
      setScannedOrderId("");

      setTimeout(() => {
        if (orderScannerRef.current) {
          orderScannerRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error completing packing:', error);
      toast({
        title: "Error",
        description: "Failed to complete packing",
        variant: "destructive",
      });
    }
  };

  const handleSelectOrder = (order: any) => {
    setCurrentOrder(order);
    setScannedOrderId("");
    
    const products: ScannedProduct[] = order.line_items?.map(item => ({
      sku: item.sku || `PROD-${item.product_id}`,
      name: item.name,
      quantity: item.quantity,
      scanned: false
    })) || [];

    setScannedProducts(products);

    setTimeout(() => {
      const scannerInput = document.getElementById('product-scanner') as HTMLInputElement;
      if (scannerInput) {
        scannerInput.focus();
      }
    }, 100);
  };

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedOrderIds);
    if (checked) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    setSelectedOrderIds(newSelectedIds);
    setSelectAll(newSelectedIds.size === packingOrders.length);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(packingOrders.map(order => order.id));
      setSelectedOrderIds(allIds);
      setSelectAll(true);
    } else {
      setSelectedOrderIds(new Set());
      setSelectAll(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (orderScannerRef.current) {
      orderScannerRef.current.focus();
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-poppins">Packing Stage</h1>
          <p className="text-muted-foreground">Scan orders and products for efficient packing workflow</p>
        </div>
        <div className="flex items-center gap-2">
          {/* NEW: Sound toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-2"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            {soundEnabled ? 'Sound On' : 'Sound Off'}
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

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready to Pack</p>
                <p className="text-2xl font-bold text-blue-600">{packingOrders.length}</p>
                <p className="text-xs text-muted-foreground">Printed orders</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready for Tracking</p>
                <p className="text-2xl font-bold text-purple-600">{trackingOrders.length}</p>
                <p className="text-xs text-muted-foreground">Packed orders</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items Scanned</p>
                <p className="text-2xl font-bold text-green-600">
                  {scannedProducts.filter(p => p.scanned).length}
                </p>
                <p className="text-xs text-muted-foreground">Current order</p>
              </div>
              <Scan className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready for Printing</p>
                <p className="text-2xl font-bold text-orange-600">{printingOrders.length}</p>
                <p className="text-xs text-muted-foreground">Awaiting labels</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Scanning and Product Scanning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barcode Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Barcode Scanner
            </CardTitle>
            <CardDescription>
              Scan order ID or order number to load complete order details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="order-scanner">Order Scanner</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  ref={orderScannerRef}
                  id="order-scanner"
                  placeholder="Scan or enter Order ID/Number"
                  value={scannedOrderId}
                  onChange={(e) => setScannedOrderId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleOrderScan()}
                />
                <Button 
                  onClick={handleOrderScan}
                  disabled={!scannedOrderId.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Scan className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {currentOrder && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Product Scanner</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="product-scanner">Scan Product</Label>
                    <Input
                      id="product-scanner"
                      placeholder="Scan product barcode or enter SKU/Name"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleProductScan()}
                      className="text-lg py-3"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter SKU, product name, or scan barcode - system will auto-match
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleProductScan}
                      disabled={!productSku.trim()}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-3"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      Scan Product
                    </Button>
                    <Button 
                      onClick={handleClearProductInput}
                      variant="outline"
                      className="py-3"
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Show matched product preview */}
                  {productSku.trim() && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Searching for: "{productSku}"
                      </p>
                      <p className="text-xs text-blue-600">
                        Press Enter or click Scan to match with order items
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Current Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            {currentOrder ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">#{currentOrder.order_number}</h3>
                    <Badge variant="default">Packing</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentOrder.customer_name}</p>
                  <p className="text-sm font-medium">{formatCurrency(currentOrder.total)}</p>
                  
                  {/* Packing Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Packing Progress</span>
                      <span>{packingProgress.packed}/{packingProgress.total} items</span>
                    </div>
                    <Progress value={packingProgress.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {packingProgress.percentage}% complete
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Products to Scan</h4>
                  <div className="space-y-2">
                    {scannedProducts.map((product, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          product.packed ? 'bg-green-50 border-green-200' : 
                          product.scanned ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {product.packed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : product.scanned ? (
                              <Clock className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Box className="w-4 h-4 text-gray-400" />
                            )}
                            <span className={`font-medium ${
                              product.packed ? 'text-green-800' : 
                              product.scanned ? 'text-blue-800' : 'text-gray-700'
                            }`}>
                              {product.name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          <p className="text-xs text-muted-foreground">Qty: {product.quantity}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={
                            product.packed ? "default" : 
                            product.scanned ? "secondary" : "outline"
                          }>
                            {product.packed ? "Packed" : product.scanned ? "Scanned" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-completion info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600 font-medium text-sm">🚀 Auto-Complete Enabled</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    Order will automatically move to tracking stage when all products are scanned
                  </p>
                </div>

                {/* Manual completion button (fallback) */}
                <Button 
                  onClick={handleCompletePacking}
                  disabled={!scannedProducts.every(p => p.scanned)}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Manually (Optional)
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Box className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Order Selected</h3>
                <p className="text-muted-foreground">
                  Scan an order ID or number to start packing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Ready for Packing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders Ready for Packing</CardTitle>
              <CardDescription>{packingOrders.length} orders waiting to be packed</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {packingOrders.length > 0 && (
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
                  
                  <BulkMovementTrigger
                    selectedOrderIds={Array.from(selectedOrderIds)}
                    selectedOrders={packingOrders.filter(order => selectedOrderIds.has(order.id))}
                    currentStage="packing"
                    onSuccess={fetchOrders}
                    variant="small"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {packingOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Orders Ready</h3>
              <p className="text-muted-foreground">
                No orders are currently ready for packing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {packingOrders.map((order) => (
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
                          • {order.items} items • {formatCurrency(order.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{order.status}</Badge>
                    <Button 
                      size="sm"
                      onClick={() => handleSelectOrder(order)}
                      variant="outline"
                    >
                      Select
                    </Button>
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
