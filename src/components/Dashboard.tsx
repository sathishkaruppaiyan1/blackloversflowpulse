
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle, AlertCircle, Clock, TrendingUp, Users, ShoppingBag, Calendar } from "lucide-react";
import { useWooCommerceOrders } from "@/hooks/useWooCommerceOrders";
import { useMemo } from "react";

export const Dashboard = () => {
  const { orders, loading, refetch } = useWooCommerceOrders();

  const stats = useMemo(() => {
    const newOrders = orders.filter(order => order.stage === 'processing').length;
    const readyToPack = orders.filter(order => order.stage === 'packing').length;
    const inTransit = orders.filter(order => order.stage === 'shipped').length;
    const delivered = orders.filter(order => order.stage === 'delivered').length;
    
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => ['delivered', 'completed'].includes(order.stage)).length;
    const successRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 98;

    // Calculate trends (simple day-over-day comparison)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.toDateString() === today.toDateString();
    }).length;

    const yesterdayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.toDateString() === yesterday.toDateString();
    }).length;

    const trendPercentage = yesterdayOrders > 0 
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : todayOrders > 0 ? 100 : 0;

    return {
      newOrders,
      readyToPack,
      inTransit,
      delivered,
      trendPercentage,
      successRate
    };
  }, [orders]);

  // Calculate today's performance metrics
  const todaysPerformance = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today && orderDate < tomorrow;
    });

    const todaysPacked = orders.filter(order => {
      if (!order.packed_at) return false;
      const packedDate = new Date(order.packed_at);
      return packedDate >= today && packedDate < tomorrow;
    });

    const todaysInTracking = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today && orderDate < tomorrow && order.stage === 'packed';
    });

    const todaysShipped = orders.filter(order => {
      if (!order.shipped_at) return false;
      const shippedDate = new Date(order.shipped_at);
      return shippedDate >= today && shippedDate < tomorrow;
    });

    return {
      received: todaysOrders.length,
      packed: todaysPacked.length,
      tracking: todaysInTracking.length,
      shipped: todaysShipped.length
    };
  }, [orders]);

  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary font-poppins">
                  {loading ? "..." : stats.newOrders}
                </div>
                <div className="text-sm text-muted-foreground font-medium">New Orders</div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{stats.trendPercentage >= 0 ? '+' : ''}{stats.trendPercentage}% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-warning font-poppins">
                  {loading ? "..." : stats.readyToPack}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Ready to Pack</div>
              </div>
              <div className="p-3 bg-warning/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              <span>Avg. 2h wait time</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-500 font-poppins">
                  {loading ? "..." : stats.inTransit}
                </div>
                <div className="text-sm text-muted-foreground font-medium">In Transit</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Est. delivery 2-3 days</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-success font-poppins">
                  {loading ? "..." : stats.delivered}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Delivered</div>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{stats.successRate}% success rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Performance */}
      <Card className="bg-gradient-to-br from-card to-muted/5">
        <CardHeader>
          <CardTitle className="text-xl font-poppins flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Today's Performance
          </CardTitle>
          <CardDescription>
            Real-time updates for today's order processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                <Package className="w-8 h-8 opacity-50 animate-pulse" />
              </div>
              <p className="text-lg font-medium">Loading performance data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Orders Received</p>
                    <p className="text-2xl font-bold text-blue-600">{todaysPerformance.received}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Orders Packed</p>
                    <p className="text-2xl font-bold text-green-600">{todaysPerformance.packed}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Tracking</p>
                    <p className="text-2xl font-bold text-orange-600">{todaysPerformance.tracking}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipped Today</p>
                    <p className="text-2xl font-bold text-purple-600">{todaysPerformance.shipped}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-poppins flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Packing
            </CardTitle>
            <CardDescription>
              Start packing process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-gradient-primary hover:shadow-lg">
              <Package className="w-4 h-4 mr-2" />
              Start Packing
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-poppins flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              Tracking
            </CardTitle>
            <CardDescription>
              Add tracking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg">
              <Truck className="w-4 h-4 mr-2" />
              Add Tracking
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-poppins flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Printing
            </CardTitle>
            <CardDescription>
              Print shipping labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-gradient-accent hover:shadow-accent">
              <CheckCircle className="w-4 h-4 mr-2" />
              Print Labels
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
