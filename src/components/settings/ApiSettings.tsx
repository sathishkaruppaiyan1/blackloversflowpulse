
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WooCommerceSettings from '@/components/WooCommerceSettings';
import InteraktSettings from '@/components/InteraktSettings';

const ApiSettings = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="woocommerce" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
          <TabsTrigger value="interakt">Interakt</TabsTrigger>
        </TabsList>

        <TabsContent value="woocommerce" className="mt-6">
          <WooCommerceSettings />
        </TabsContent>

        <TabsContent value="interakt" className="mt-6">
          <InteraktSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiSettings;
