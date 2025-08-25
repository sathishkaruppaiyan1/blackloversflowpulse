import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { orderStageMovementService } from './orderStageMovementService';

export type OrderStage = 'processing' | 'packing' | 'packed' | 'shipped' | 'delivered';

export interface BulkMoveOptions {
  bypassValidation?: boolean;
  preserveTimestamps?: boolean;
  skipWooSync?: boolean;
  notes?: string;
}

export interface BulkMoveResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
}

export const bulkOrderMovementService = {
  async bulkUpdateOrderStage(
    orderIds: string[],
    targetStage: OrderStage,
    options: BulkMoveOptions = {}
  ): Promise<BulkMoveResult> {
    console.log(`🚀 Starting bulk movement of ${orderIds.length} orders to ${targetStage}`);
    
    const {
      bypassValidation = false,
      preserveTimestamps = false,
      skipWooSync = true, // Default to skip WooSync for bulk operations
      notes = ''
    } = options;

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const orderId of orderIds) {
      try {
        // Get current order info
        const { data: currentOrder, error: fetchError } = await supabase
          .from('orders')
          .select('status, user_id, woo_order_id, order_number')
          .eq('id', orderId)
          .single();

        if (fetchError) {
          errors.push(`Failed to fetch order ${orderId}: ${fetchError.message}`);
          failedCount++;
          continue;
        }

        const previousStage = currentOrder.status;
        const updateData: any = { status: targetStage };
        
        // Add timestamp fields based on stage (unless preserving)
        if (!preserveTimestamps) {
          const now = new Date().toISOString();
          switch (targetStage) {
            case 'packing':
              updateData.printed_at = now;
              break;
            case 'packed':
              updateData.packed_at = now;
              break;
            case 'shipped':
              updateData.shipped_at = now;
              break;
            case 'delivered':
              updateData.delivered_at = now;
              break;
          }
        }

        // Update in database
        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        if (updateError) {
          errors.push(`Failed to update order ${currentOrder.order_number}: ${updateError.message}`);
          failedCount++;
          continue;
        }

        // Record stage movement
        try {
          await orderStageMovementService.recordStageMovement(
            orderId,
            previousStage,
            targetStage,
            notes || `Bulk moved from ${previousStage} to ${targetStage}`
          );
        } catch (movementError) {
          console.error('Error recording stage movement:', movementError);
          // Don't fail the operation for movement logging errors
        }

        processedCount++;
        console.log(`✅ Successfully moved order ${currentOrder.order_number} to ${targetStage}`);

      } catch (error: any) {
        errors.push(`Unexpected error for order ${orderId}: ${error.message}`);
        failedCount++;
      }
    }

    const result: BulkMoveResult = {
      success: failedCount === 0,
      processedCount,
      failedCount,
      errors
    };

    // Show appropriate toast message
    if (result.success) {
      toast.success(`Successfully moved ${processedCount} orders to ${targetStage} stage`);
    } else if (processedCount > 0) {
      toast.warning(`Moved ${processedCount} orders successfully, ${failedCount} failed`);
    } else {
      toast.error(`Failed to move orders: ${errors[0] || 'Unknown error'}`);
    }

    console.log(`🏁 Bulk movement completed: ${processedCount} success, ${failedCount} failed`);
    return result;
  },

  // Get available target stages for a given current stage
  getAvailableStages(currentStage: OrderStage): OrderStage[] {
    const allStages: OrderStage[] = ['processing', 'packing', 'packed', 'shipped', 'delivered'];
    
    // For bulk operations, allow movement to any stage except the current one
    return allStages.filter(stage => stage !== currentStage);
  },

  // Get stage display name
  getStageDisplayName(stage: OrderStage): string {
    const stageNames = {
      processing: 'Printing',
      packing: 'Packing',
      packed: 'Ready for Tracking',
      shipped: 'Shipped',
      delivered: 'Delivered'
    };
    return stageNames[stage] || stage;
  },

  // Get stage color for UI
  getStageColor(stage: OrderStage): string {
    const stageColors = {
      processing: 'orange',
      packing: 'blue',
      packed: 'purple',
      shipped: 'green',
      delivered: 'emerald'
    };
    return stageColors[stage] || 'gray';
  }
};