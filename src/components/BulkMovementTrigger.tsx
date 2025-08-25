import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MoveRight } from 'lucide-react';
import { BulkMovementDialog } from './BulkMovementDialog';
import { OrderStage } from '@/services/bulkOrderMovementService';

interface BulkMovementTriggerProps {
  selectedOrderIds: string[];
  selectedOrders?: any[];
  currentStage?: OrderStage;
  onSuccess?: () => void;
  variant?: 'button' | 'small' | 'icon';
  className?: string;
}

export const BulkMovementTrigger: React.FC<BulkMovementTriggerProps> = ({
  selectedOrderIds,
  selectedOrders = [],
  currentStage,
  onSuccess,
  variant = 'button',
  className = ''
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSuccess = () => {
    setDialogOpen(false);
    onSuccess?.();
  };

  if (selectedOrderIds.length === 0) {
    return null;
  }

  const renderTrigger = () => {
    switch (variant) {
      case 'small':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className={`text-xs ${className}`}
          >
            <MoveRight className="w-3 h-3 mr-1" />
            Move ({selectedOrderIds.length})
          </Button>
        );
      
      case 'icon':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className={`px-2 ${className}`}
            title={`Move ${selectedOrderIds.length} selected orders`}
          >
            <MoveRight className="w-4 h-4" />
          </Button>
        );
      
      default:
        return (
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className={className}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Bulk Move ({selectedOrderIds.length})
          </Button>
        );
    }
  };

  return (
    <>
      {renderTrigger()}
      
      <BulkMovementDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedOrderIds={selectedOrderIds}
        selectedOrders={selectedOrders}
        currentStage={currentStage}
        onSuccess={handleSuccess}
      />
    </>
  );
};