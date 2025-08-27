import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Users, Clock, CheckCircle, BarChart3, PieChart } from "lucide-react";
import { useWooCommerceOrders } from "@/hooks/useWooCommerceOrders";
import { useCompletedOrders } from "@/hooks/useCompletedOrders";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Pie } from "recharts";
import { useMemo } from "react";

const chartConfig = {
  orders: {
    label: "Orders",
  },
  processing: {
    label: "Processing",
  },
  packing: {
    label: "Packing", 
  },
  packed: {
    label: "Packed",
  },
  shipped: {
    label: "Shipped",
  },
  delivered: {
    label: "Delivered",
  },
  completed: {
    label: "Completed",
  },
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AnalyticsPage = () => {
  const { orders, loading } = useWooCommerceOrders();
  const { completedOrders } = useCompletedOrders();

  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrdersCount = orders.filter(order => ['delivered', 'completed'].includes(order.stage)).length;
    
    // Calculate average processing time
    const completedOrdersWithTimes = orders.filter(order => 
      order.created_at && order.delivered_at && ['delivered', 'completed'].includes(order.stage)
    );
    
    const avgProcessTime = completedOrdersWithTimes.length > 0 
      ? Math.round(
          completedOrdersWithTimes.reduce((acc, order) => {
            const start = new Date(order.created_at).getTime();
            const end = new Date(order.delivered_at!).getTime();
            return acc + ((end - start) / (1000 * 60 * 60)); // Convert to hours
          }, 0) / completedOrdersWithTimes.length
        )
      : 0;

    // Order status distribution
    const statusDistribution = orders.reduce((acc, order) => {
      acc[order.stage] = (acc[order.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(statusDistribution).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percentage: Math.round((count / totalOrders) * 100)
    }));

    // Daily orders chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = orders.filter(order => 
        order.created_at.split('T')[0] === dateStr
      ).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dayOrders,
        fullDate: dateStr
      });
    }

    return {
      totalOrders,
      completedOrdersCount,
      avgProcessTime,
      pieData,
      last7Days,
      completionRate: totalOrders > 0 ? Math.round((completedOrdersCount / totalOrders) * 100) : 0
    };
  }, [orders]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics - Order Performance</h1>
        <p className="text-muted-foreground">Monitor your fulfillment performance and order analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {loading ? "..." : analytics.totalOrders}
                </div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
              <Package className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? "..." : analytics.completedOrdersCount}
                </div>
                <div className="text-sm text-muted-foreground">Completed Orders</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? "..." : `${analytics.avgProcessTime}h`}
                </div>
                <div className="text-sm text-muted-foreground">Avg Process Time</div>
              </div>
              <Clock className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Orders (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Order volume trends over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading chart data...</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.last7Days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="orders" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Order Status Distribution
            </CardTitle>
            <CardDescription>
              Current status breakdown of all orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading chart data...</p>
              </div>
            ) : analytics.pieData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.pieData}
                      cx="50%"
                      cy="50%"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No data available for chart</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Order Completion Rate</CardTitle>
          <CardDescription>
            Overall completion metrics and fulfillment performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading completion data...</p>
            </div>
          ) : analytics.totalOrders > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Overall Completion Rate</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {analytics.completionRate}%
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analytics.completionRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.totalOrders}</div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.completedOrdersCount}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytics.avgProcessTime}h</div>
                  <div className="text-sm text-muted-foreground">Avg Time</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No completion data available. Connect to WooCommerce to see completion analytics.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
