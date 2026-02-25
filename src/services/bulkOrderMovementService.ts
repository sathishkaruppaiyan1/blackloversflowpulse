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

    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      try {
        console.log(`🔄 Processing order ${i + 1}/${orderIds.length}: ${orderId}`);
        
        // Get current order info
        const { data: currentOrder, error: fetchError } = await supabase
          .from('orders')
          .select('status, user_id, woo_order_id, order_number')
          .eq('id', orderId)
          .single();

        if (fetchError) {
          const errorMsg = `Failed to fetch order ${orderId}: ${fetchError.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
          continue;
        }
        
        if (!currentOrder) {
          const errorMsg = `Order ${orderId} not found in database`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
          continue;
        }

        const previousStage = currentOrder.status;
        const updateData: any = { status: targetStage };
        
        // When moving back to processing (printing), always clear stage timestamps so orders appear in Printing stage.
        // Without this, orders would have status=processing but printed_at/packed_at set and disappear from both stages.
        if (targetStage === 'processing') {
          updateData.printed_at = null;
          updateData.packed_at = null;
          updateData.shipped_at = null;
          updateData.delivered_at = null;
          updateData.tracking_number = null;
          updateData.carrier = null;
          console.log(`📝 Clearing stage timestamps for order ${currentOrder.order_number} (moving to printing)`);
        } else if (!preserveTimestamps) {
          const now = new Date().toISOString();
          switch (targetStage) {
            case 'packing':
              // Moving to packing means printing is done
              updateData.printed_at = now;
              console.log(`📝 Setting printed_at for order ${currentOrder.order_number} to ${now}`);
              break;
            case 'packed':
              // If going directly to packed (bypass packing), still set printed_at if not already set
              // This handles the case where orders skip packing stage
              updateData.printed_at = now;
              updateData.packed_at = now;
              console.log(`📝 Setting printed_at AND packed_at for order ${currentOrder.order_number} to ${now} (bypass packing)`);
              break;
            case 'shipped':
              updateData.shipped_at = now;
              break;
            case 'delivered':
              updateData.delivered_at = now;
              break;
          }
        }

        // Log what we're updating (only for forward moves that set printed_at)
        if (updateData.printed_at) {
          console.log(`🖨️ Updating order ${currentOrder.order_number} with printed_at: ${updateData.printed_at}`);
        }

        // Update in database
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId)
          .select('id, status, order_number, printed_at')
          .single();
        
        // Verify printed_at was set
        if (updateData.printed_at && updatedOrder) {
          console.log(`✅ Order ${currentOrder.order_number} updated. printed_at in response: ${updatedOrder.printed_at || 'MISSING!'}`);
          if (!updatedOrder.printed_at) {
            console.error(`❌ WARNING: printed_at was not set for order ${currentOrder.order_number} even though we tried to set it!`);
          }
        }

        if (updateError) {
          const errorMsg = `Failed to update order ${currentOrder.order_number} (${orderId}): ${updateError.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
          continue;
        }
        
        if (!updatedOrder) {
          const errorMsg = `Order ${currentOrder.order_number} (${orderId}) update returned no data`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
          continue;
        }
        
        // Verify the update was successful
        if (updatedOrder.status !== targetStage) {
          const errorMsg = `Order ${currentOrder.order_number} (${orderId}) status mismatch: expected ${targetStage}, got ${updatedOrder.status}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
          continue;
        }

        // Record stage movement (use display names in notes so DB shows "Printing" not "processing")
        try {
          await orderStageMovementService.recordStageMovement(
            orderId,
            previousStage,
            targetStage,
            notes || `Bulk moved from ${bulkOrderMovementService.getStageDisplayName(previousStage)} to ${bulkOrderMovementService.getStageDisplayName(targetStage)}`
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

    // Show appropriate toast message (use display name e.g. "Printing" not "processing")
    const targetStageDisplayName = bulkOrderMovementService.getStageDisplayName(targetStage);
    if (result.success) {
      toast.success(`Successfully moved ${processedCount} orders to ${targetStageDisplayName} stage`);
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
  getStageDisplayName(stage: string): string {
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