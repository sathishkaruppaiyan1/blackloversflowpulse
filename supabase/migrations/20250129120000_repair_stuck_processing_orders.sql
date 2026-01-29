-- Repair orders that were moved from tracking (packed) to printing (processing)
-- but only had status updated without clearing printed_at/packed_at.
-- Those orders disappeared from both stages because:
-- - Tracking shows status='packed' (they no longer match)
-- - Printing shows status='processing' AND printed_at IS NULL AND packed_at IS NULL (they didn't match)
-- This migration clears stage timestamps for such orders so they appear in Printing again.

UPDATE public.orders
SET
  printed_at = NULL,
  packed_at = NULL,
  shipped_at = NULL,
  delivered_at = NULL,
  tracking_number = NULL,
  carrier = NULL,
  updated_at = now()
WHERE status = 'processing'
  AND (printed_at IS NOT NULL OR packed_at IS NOT NULL);
