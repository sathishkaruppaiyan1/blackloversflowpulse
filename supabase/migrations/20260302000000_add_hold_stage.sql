-- Add hold stage support to orders table
-- hold_previous_stage: stores which stage the order was in before being put on hold
-- held_at: timestamp when the order was put on hold

ALTER TABLE orders ADD COLUMN IF NOT EXISTS hold_previous_stage TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ;
