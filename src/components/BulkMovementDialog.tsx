
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, Settings } from 'lucide-react';
import { bulkOrderMovementService, OrderStage, BulkMoveOptions } from '@/services/bulkOrderMovementService';
import { toast } from 'sonner';

interface BulkMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderIds: string[];
  selectedOrders?: any[]; // Order objects for display
  currentStage?: OrderStage;
  onSuccess?: () => void;
}

export const BulkMovementDialog: React.FC<BulkMovementDialogProps> = ({
  isOpen,
  onClose,
  selectedOrderIds,
  selectedOrders = [],
  currentStage,
  onSuccess
}) => {
  const [targetStage, setTargetStage] = useState<OrderStage | ''>('');
  const [bypassValidation, setBypassValidation] = useState(false);
  const [preserveTimestamps, setPreserveTimestamps] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const availableStages = currentStage 
    ? bulkOrderMovementService.getAvailableStages(currentStage)
    : (['processing', 'packing', 'packed', 'shipped', 'delivered'] as OrderStage[]);

  const handleSubmit = async () => {
    if (!targetStage) return;

    setLoading(true);
    try {
      const options: BulkMoveOptions = {
        bypassValidation,
        preserveTimestamps,
        skipWooSync: true, // Always skip WooSync for bulk operations
        notes: notes.trim() || undefined
      };

      const result = await bulkOrderMovementService.bulkUpdateOrderStage(
        selectedOrderIds,
        targetStage as OrderStage,
        options
      );

      if (result.success || result.processedCount > 0) {
        onSuccess?.();
        handleClose();
      } else {
        // Show error if no orders were processed
        toast.error(`Failed to move orders: ${result.errors[0] || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Bulk movement error:', error);
      toast.error(`Failed to move orders: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTargetStage('');
    setBypassValidation(false);
    setPreserveTimestamps(false);
    setNotes('');
    onClose();
  };

  const getStageMovementWarning = () => {
    if (!currentStage || !targetStage) return null;

    const stageOrder = ['processing', 'packing', 'packed', 'shipped', 'delivered'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = stageOrder.indexOf(targetStage as OrderStage);

    if (targetIndex < currentIndex) {
      return (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            Warning: Moving orders backwards in the workflow
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Bulk Move Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length} orders selected
              </span>
              {currentStage && (
                <Badge variant="outline" className="text-xs">
                  From: {bulkOrderMovementService.getStageDisplayName(currentStage)}
                </Badge>
              )}
            </div>
            {selectedOrders.length > 0 && (
              <div className="mt-2 text-xs text-blue-700">
                {selectedOrders.slice(0, 3).map(order => order.order_number).join(', ')}
                {selectedOrders.length > 3 && ` and ${selectedOrders.length - 3} more...`}
              </div>
            )}
          </div>

          {/* Target Stage Selection */}
          <div>
            <Label htmlFor="target-stage">Move to Stage</Label>
            <Select value={targetStage} onValueChange={(value: string) => setTargetStage(value as OrderStage | '')}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select target stage" />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {bulkOrderMovementService.getStageDisplayName(stage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement Warning */}
          {getStageMovementWarning()}

          {/* Advanced Options */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Advanced Options</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bypass-validation"
                  checked={bypassValidation}
                  onCheckedChange={(checked) => setBypassValidation(checked === true)}
                />
                <Label htmlFor="bypass-validation" className="text-sm">
                  Bypass stage validations
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-timestamps"
                  checked={preserveTimestamps}
                  onCheckedChange={(checked) => setPreserveTimestamps(checked === true)}
                />
                <Label htmlFor="preserve-timestamps" className="text-sm">
                  Preserve existing timestamps
                </Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a note for this bulk movement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!targetStage || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Moving...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move Orders
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
