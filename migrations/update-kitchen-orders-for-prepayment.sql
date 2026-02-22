-- Migration: Update kitchen_orders table for pre-payment order flow
-- Date: 2026-01-04
-- Description: Allow kitchen orders to be created before payment/sale completion

-- Make saleId nullable (MUST RUN FIRST)
ALTER TABLE kitchen_orders 
MODIFY COLUMN saleId INT NULL 
COMMENT 'Linked sale ID (null if payment not yet completed)';

-- Drop and recreate foreign key constraint with SET NULL on delete
ALTER TABLE kitchen_orders DROP FOREIGN KEY kitchen_orders_ibfk_1;

ALTER TABLE kitchen_orders 
ADD CONSTRAINT kitchen_orders_ibfk_1 
FOREIGN KEY (saleId) 
REFERENCES sales(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Add new fields for customer info and payment tracking
ALTER TABLE kitchen_orders 
ADD COLUMN tableId INT NULL COMMENT 'Table ID reference for dine-in orders' AFTER tableNumber;

ALTER TABLE kitchen_orders 
ADD COLUMN customerPhone VARCHAR(20) NULL COMMENT 'Customer phone number' AFTER customerName;

ALTER TABLE kitchen_orders 
ADD COLUMN customerEmail VARCHAR(100) NULL COMMENT 'Customer email address' AFTER customerPhone;

ALTER TABLE kitchen_orders 
ADD COLUMN paymentMethod VARCHAR(50) NULL COMMENT 'Selected payment method (cash, card, etc.)' AFTER customerEmail;

ALTER TABLE kitchen_orders 
ADD COLUMN subtotal DECIMAL(10, 2) NULL COMMENT 'Order subtotal before tax' AFTER paymentMethod;

ALTER TABLE kitchen_orders 
ADD COLUMN tax DECIMAL(10, 2) NULL COMMENT 'Tax amount' AFTER subtotal;

ALTER TABLE kitchen_orders 
ADD COLUMN totalAmount DECIMAL(10, 2) NULL COMMENT 'Total order amount including tax' AFTER tax;
