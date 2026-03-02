import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderAnalytics } from "@/components/analytics/OrderAnalytics";
import { ProductAnalytics } from "@/components/analytics/ProductAnalytics";

export const AnalyticsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Comprehensive order and product analytics</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Order Analytics</TabsTrigger>
          <TabsTrigger value="products">Product Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6">
          <OrderAnalytics />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};
