
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryDashboard from './InventoryDashboard';
import ProductList from './ProductList';
import SalesReports from './SalesReports';

const InventoryPage = () => {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="reports">Sales Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <InventoryDashboard />
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <ProductList />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <SalesReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryPage;
