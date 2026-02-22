-- Migration: Add status management fields to Sales and KitchenOrders tables
-- Run this SQL script in your MySQL database

USE vihi_pos;

-- Add fields to Sales table
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS cancellationReason VARCHAR(500) NULL COMMENT 'Reason for order cancellation if voided',
  ADD COLUMN IF NOT EXISTS cancellationNote TEXT NULL COMMENT 'Additional notes for cancellation',
  ADD COLUMN IF NOT EXISTS completionReason VARCHAR(500) NULL COMMENT 'Reason or notes for order completion',
  ADD COLUMN IF NOT EXISTS statusUpdatedBy INT NULL COMMENT 'User who last updated the order status',
  ADD COLUMN IF NOT EXISTS statusUpdatedAt DATETIME NULL COMMENT 'Timestamp of last status update';

-- Add foreign key for statusUpdatedBy in sales table
-- ALTER TABLE sales ADD CONSTRAINT fk_sales_status_user FOREIGN KEY (statusUpdatedBy) REFERENCES users(id);

-- Add fields to KitchenOrders table
ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS cancellationReason VARCHAR(500) NULL COMMENT 'Reason for order cancellation',
  ADD COLUMN IF NOT EXISTS cancellationNote TEXT NULL COMMENT 'Additional notes for cancellation',
  ADD COLUMN IF NOT EXISTS completionReason VARCHAR(500) NULL COMMENT 'Reason or notes for order completion',
  ADD COLUMN IF NOT EXISTS statusUpdatedBy INT NULL COMMENT 'User who last updated the order status',
  ADD COLUMN IF NOT EXISTS statusUpdatedAt DATETIME NULL COMMENT 'Timestamp of last status update';

-- Add foreign key for statusUpdatedBy in kitchen_orders table
-- ALTER TABLE kitchen_orders ADD CONSTRAINT fk_kitchen_orders_status_user FOREIGN KEY (statusUpdatedBy) REFERENCES users(id);

-- Verify the changes
DESCRIBE sales;
DESCRIBE kitchen_orders;

SELECT 'Migration completed successfully!' AS status;
