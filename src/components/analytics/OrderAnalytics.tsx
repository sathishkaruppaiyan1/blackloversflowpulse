import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, IndianRupee, BarChart3, PieChart, Truck, Printer, PackageCheck, Users } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart as RechartsPieChart, Cell, Pie, Legend,
  AreaChart, Area, Tooltip,
} from "recharts";
import { useAnalyticsData, DateRangePreset } from "@/hooks/useAnalyticsData";
import { useDailyOperationsReport } from "@/hooks/useDailyOperationsReport";
import { AnalyticsDateFilter } from "./AnalyticsDateFilter";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];
const OPS_COLORS = { printed: '#8b5cf6', packed: '#3b82f6', shipped: '#22c55e' };

const chartConfig = {
  value: { label: "Value" },
  revenue: { label: "Revenue" },
  orders: { label: "Orders" },
  count: { label: "Count" },
  printed: { label: "Printed", color: OPS_COLORS.printed },
  packed: { label: "Packed", color: OPS_COLORS.packed },
  shipped: { label: "Shipped", color: OPS_COLORS.shipped },
};

export const OrderAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30days");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const { loading, orderAnalytics } = useAnalyticsData({
    dateRange,
    customStartDate: customStart,
    customEndDate: customEnd,
  });

  const { dailyStats, summary, loading: opsLoading } = useDailyOperationsReport(7);

  const a = orderAnalytics;

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customStartDate={customStart}
        customEndDate={customEnd}
        onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{loading ? "..." : a.totalOrders}</div>
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
                  {loading ? "..." : `\u20B9${Math.round(a.totalRevenue).toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <IndianRupee className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : `\u20B9${Math.round(a.avgOrderValue).toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? "..." : `${a.fulfillmentRate}%`}
                </div>
                <div className="text-sm text-muted-foreground">Fulfillment Rate</div>
              </div>
              <Truck className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Operations Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Operations (Last 7 Days)
          </CardTitle>
          <CardDescription>Printed, packed, and shipped orders each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Printer className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Printed Today</span>
              </div>
              <div className="text-3xl font-bold text-purple-500">{opsLoading ? "..." : summary.todayPrinted}</div>
              <div className="text-xs text-muted-foreground mt-1">Week: {summary.weekPrinted}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <PackageCheck className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Packed Today</span>
              </div>
              <div className="text-3xl font-bold text-blue-500">{opsLoading ? "..." : summary.todayPacked}</div>
              <div className="text-xs text-muted-foreground mt-1">Week: {summary.weekPacked}</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Shipped Today</span>
              </div>
              <div className="text-3xl font-bold text-green-500">{opsLoading ? "..." : summary.todayShipped}</div>
              <div className="text-xs text-muted-foreground mt-1">Week: {summary.weekShipped}</div>
            </div>
          </div>
          {!opsLoading && (
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="printed" name="Printed" fill={OPS_COLORS.printed} />
                  <Bar dataKey="packed" name="Packed" fill={OPS_COLORS.packed} />
                  <Bar dataKey="shipped" name="Shipped" fill={OPS_COLORS.shipped} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue & Orders Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : a.revenueOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={a.revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data for selected period</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Orders Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : a.ordersOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={a.ordersOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Orders']} />
                  <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data for selected period</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status & Carrier Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : a.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={a.ordersByStatus}
                    cx="50%"
                    cy="50%"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {a.ordersByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Orders by Carrier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : a.ordersByCarrier.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={a.ordersByCarrier}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No carrier data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top 10 Customers
          </CardTitle>
          <CardDescription>By total spent</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : a.topCustomers.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Customer</th>
                    <th className="text-right p-3 font-medium">Orders</th>
                    <th className="text-right p-3 font-medium">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {a.topCustomers.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </td>
                      <td className="p-3 text-right">{c.orders}</td>
                      <td className="p-3 text-right font-medium">{"\u20B9"}{Math.round(c.totalSpent).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No customer data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
