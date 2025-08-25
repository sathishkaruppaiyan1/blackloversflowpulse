
import React from 'react';
import WooCommerceSettings from '@/components/WooCommerceSettings';
import InteraktSettings from '@/components/InteraktSettings';

const ApiSettings = () => {
  return (
    <div className="space-y-6">
      <WooCommerceSettings />
      <InteraktSettings />
    </div>
  );
};

export default ApiSettings;
