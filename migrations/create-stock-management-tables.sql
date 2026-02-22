-- Migration: Create Stock Management System
-- Description: Complete stock management with transactions, transfers, adjustments, and damaged stock tracking
-- Date: 2026-01-14

-- ============================================
-- STOCK TRANSACTIONS TABLE
-- ============================================
-- Main table for all stock operations
CREATE TABLE IF NOT EXISTS stock_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto-generated unique transaction number (e.g., ST-2026-0001)',
  
  -- Transaction details
  transaction_type ENUM(
    'add_stock',          -- Purchase/receiving stock
    'adjustment',         -- Manual stock adjustments (count corrections)
    'transfer_out',       -- Transfer from this location
    'transfer_in',        -- Transfer to this location
    'damaged',            -- Damaged/expired items write-off
    'return_to_supplier', -- Return to supplier
    'sale_deduction',     -- Automatic deduction from sales
    'usage',              -- Usage for production/recipes
    'opening_balance'     -- Initial stock setup
  ) NOT NULL,
  
  -- Ingredient reference
  ingredient_id INT NOT NULL,
  
  -- Quantity changes
  quantity DECIMAL(10, 3) NOT NULL COMMENT 'Positive for additions, negative for deductions',
  unit VARCHAR(50) NOT NULL,
  
  -- Stock levels
  previous_stock DECIMAL(10, 3) NOT NULL COMMENT 'Stock before transaction',
  new_stock DECIMAL(10, 3) NOT NULL COMMENT 'Stock after transaction',
  
  -- Cost tracking
  unit_cost DECIMAL(10, 2) DEFAULT NULL COMMENT 'Cost per unit',
  total_cost DECIMAL(10, 2) DEFAULT NULL COMMENT 'Total cost of transaction',
  
  -- Location tracking
  from_location VARCHAR(255) DEFAULT NULL COMMENT 'Source location for transfers',
  to_location VARCHAR(255) DEFAULT NULL COMMENT 'Destination location for transfers',
  storage_location VARCHAR(255) DEFAULT NULL COMMENT 'Current storage location',
  
  -- Reference information
  reference_type VARCHAR(50) DEFAULT NULL COMMENT 'Type: purchase_order, sale, transfer, adjustment, etc.',
  reference_id INT DEFAULT NULL COMMENT 'ID of related entity',
  reference_number VARCHAR(100) DEFAULT NULL COMMENT 'External reference number (PO#, Invoice#, etc.)',
  
  -- Reason and notes
  reason VARCHAR(255) DEFAULT NULL COMMENT 'Reason for adjustment/damage/return',
  notes TEXT DEFAULT NULL COMMENT 'Additional notes',
  
  -- Batch/Lot tracking
  batch_number VARCHAR(100) DEFAULT NULL COMMENT 'Batch or lot number',
  expiry_date DATE DEFAULT NULL COMMENT 'Expiry date for the batch',
  
  -- Approval workflow
  status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'completed',
  approved_by INT DEFAULT NULL COMMENT 'User who approved the transaction',
  approved_at TIMESTAMP DEFAULT NULL,
  
  -- User tracking
  performed_by INT NOT NULL COMMENT 'User who performed the transaction',
  created_by INT DEFAULT NULL COMMENT 'User who created the record',
  
  -- Timestamps
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When transaction occurred',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_transaction_number (transaction_number),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_ingredient (ingredient_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_status (status),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_batch (batch_number),
  INDEX idx_composite_search (ingredient_id, transaction_date, transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Complete stock transaction history for all operations';


-- ============================================
-- STOCK TRANSFERS TABLE
-- ============================================
-- Detailed tracking of stock transfers between locations
CREATE TABLE IF NOT EXISTS stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto-generated transfer number (e.g., TRF-2026-0001)',
  
  -- Transfer details
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  transfer_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Status tracking
  status ENUM('pending', 'in_transit', 'received', 'rejected', 'cancelled') DEFAULT 'pending',
  
  -- User tracking
  initiated_by INT NOT NULL COMMENT 'User who initiated the transfer',
  received_by INT DEFAULT NULL COMMENT 'User who received the transfer',
  approved_by INT DEFAULT NULL COMMENT 'User who approved the transfer',
  
  -- Notes and reason
  reason TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP DEFAULT NULL,
  approved_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_transfer_number (transfer_number),
  INDEX idx_status (status),
  INDEX idx_from_location (from_location(100)),
  INDEX idx_to_location (to_location(100)),
  INDEX idx_transfer_date (transfer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock transfer headers between locations';


-- ============================================
-- STOCK TRANSFER ITEMS TABLE
-- ============================================
-- Individual items in each transfer
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  
  -- Quantities
  quantity_sent DECIMAL(10, 3) NOT NULL,
  quantity_received DECIMAL(10, 3) DEFAULT NULL COMMENT 'Actual quantity received (may differ)',
  unit VARCHAR(50) NOT NULL,
  
  -- Cost tracking
  unit_cost DECIMAL(10, 2) DEFAULT NULL,
  total_cost DECIMAL(10, 2) DEFAULT NULL,
  
  -- Batch tracking
  batch_number VARCHAR(100) DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  
  -- Damage/loss tracking
  damaged_quantity DECIMAL(10, 3) DEFAULT 0,
  damage_reason TEXT DEFAULT NULL,
  
  notes TEXT DEFAULT NULL,
  
  -- Link to stock transactions
  stock_transaction_out_id INT DEFAULT NULL COMMENT 'Transaction ID for outbound',
  stock_transaction_in_id INT DEFAULT NULL COMMENT 'Transaction ID for inbound',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
  FOREIGN KEY (stock_transaction_out_id) REFERENCES stock_transactions(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_transaction_in_id) REFERENCES stock_transactions(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_transfer (transfer_id),
  INDEX idx_ingredient (ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual items in stock transfers';


-- ============================================
-- DAMAGED STOCK TABLE
-- ============================================
-- Track damaged, expired, or wasted stock
CREATE TABLE IF NOT EXISTS damaged_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  damage_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto-generated damage report number',
  
  ingredient_id INT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  
  -- Damage details
  damage_type ENUM('expired', 'spoiled', 'broken', 'contaminated', 'other') NOT NULL,
  damage_reason TEXT NOT NULL,
  damage_date DATE NOT NULL,
  
  -- Cost impact
  unit_cost DECIMAL(10, 2) DEFAULT NULL,
  total_loss DECIMAL(10, 2) DEFAULT NULL COMMENT 'Total value lost',
  
  -- Batch information
  batch_number VARCHAR(100) DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  
  -- Location
  location VARCHAR(255) DEFAULT NULL COMMENT 'Where damage occurred',
  
  -- Responsibility
  reported_by INT NOT NULL,
  approved_by INT DEFAULT NULL,
  
  -- Status
  status ENUM('reported', 'approved', 'rejected', 'written_off') DEFAULT 'reported',
  
  -- Disposal
  disposal_method VARCHAR(255) DEFAULT NULL COMMENT 'How the damaged goods were disposed',
  disposal_date DATE DEFAULT NULL,
  
  -- Link to transaction
  stock_transaction_id INT DEFAULT NULL,
  
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_transaction_id) REFERENCES stock_transactions(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_damage_number (damage_number),
  INDEX idx_ingredient (ingredient_id),
  INDEX idx_damage_date (damage_date),
  INDEX idx_damage_type (damage_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracking of damaged, expired, or wasted inventory';


-- ============================================
-- STOCK RETURNS TABLE
-- ============================================
-- Returns to suppliers
CREATE TABLE IF NOT EXISTS stock_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto-generated return number',
  
  ingredient_id INT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  
  -- Return details
  return_reason ENUM('defective', 'wrong_item', 'excess', 'expired', 'quality_issue', 'other') NOT NULL,
  return_description TEXT DEFAULT NULL,
  return_date DATE NOT NULL,
  
  -- Supplier information
  supplier_name VARCHAR(255) DEFAULT NULL,
  supplier_contact VARCHAR(255) DEFAULT NULL,
  
  -- Financial
  unit_cost DECIMAL(10, 2) DEFAULT NULL,
  total_refund DECIMAL(10, 2) DEFAULT NULL,
  refund_status ENUM('pending', 'approved', 'refunded', 'rejected') DEFAULT 'pending',
  refund_date DATE DEFAULT NULL,
  
  -- Original purchase reference
  original_purchase_reference VARCHAR(100) DEFAULT NULL COMMENT 'Original PO or invoice number',
  batch_number VARCHAR(100) DEFAULT NULL,
  
  -- Status tracking
  status ENUM('pending', 'approved', 'shipped', 'completed', 'rejected') DEFAULT 'pending',
  
  -- User tracking
  initiated_by INT NOT NULL,
  approved_by INT DEFAULT NULL,
  
  -- Link to transaction
  stock_transaction_id INT DEFAULT NULL,
  
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
  FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (stock_transaction_id) REFERENCES stock_transactions(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_return_number (return_number),
  INDEX idx_ingredient (ingredient_id),
  INDEX idx_return_date (return_date),
  INDEX idx_status (status),
  INDEX idx_refund_status (refund_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock returns to suppliers';


-- ============================================
-- STOCK LOCATIONS TABLE
-- ============================================
-- Manage multiple storage locations
CREATE TABLE IF NOT EXISTS stock_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_code VARCHAR(50) NOT NULL UNIQUE,
  location_name VARCHAR(255) NOT NULL,
  location_type ENUM('warehouse', 'kitchen', 'store', 'refrigerator', 'freezer', 'dry_storage', 'other') NOT NULL,
  
  -- Address/details
  address TEXT DEFAULT NULL,
  capacity DECIMAL(10, 2) DEFAULT NULL COMMENT 'Storage capacity',
  capacity_unit VARCHAR(50) DEFAULT NULL,
  
  -- Responsible person
  manager_id INT DEFAULT NULL,
  contact_phone VARCHAR(50) DEFAULT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_location_code (location_code),
  INDEX idx_location_type (location_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Storage locations for inventory';


-- ============================================
-- STOCK RECONCILIATION TABLE
-- ============================================
-- Physical stock count reconciliation
CREATE TABLE IF NOT EXISTS stock_reconciliations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reconciliation_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Reconciliation details
  reconciliation_date DATE NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  
  -- Status
  status ENUM('in_progress', 'completed', 'approved', 'cancelled') DEFAULT 'in_progress',
  
  -- User tracking
  performed_by INT NOT NULL,
  approved_by INT DEFAULT NULL,
  
  -- Summary
  total_items_counted INT DEFAULT 0,
  total_discrepancies INT DEFAULT 0,
  total_value_difference DECIMAL(10, 2) DEFAULT 0,
  
  notes TEXT DEFAULT NULL,
  
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NULL,
  approved_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_reconciliation_number (reconciliation_number),
  INDEX idx_reconciliation_date (reconciliation_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock count reconciliation records';


-- ============================================
-- STOCK RECONCILIATION ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reconciliation_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  
  -- Stock levels
  system_stock DECIMAL(10, 3) NOT NULL COMMENT 'Stock level in system',
  physical_stock DECIMAL(10, 3) NOT NULL COMMENT 'Actual counted stock',
  difference DECIMAL(10, 3) NOT NULL COMMENT 'Difference (physical - system)',
  
  unit VARCHAR(50) NOT NULL,
  
  -- Cost impact
  unit_cost DECIMAL(10, 2) DEFAULT NULL,
  value_difference DECIMAL(10, 2) DEFAULT NULL,
  
  -- Details
  reason TEXT DEFAULT NULL COMMENT 'Reason for discrepancy',
  batch_number VARCHAR(100) DEFAULT NULL,
  
  -- Resolution
  adjustment_made BOOLEAN DEFAULT FALSE,
  stock_transaction_id INT DEFAULT NULL COMMENT 'Link to adjustment transaction',
  
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (reconciliation_id) REFERENCES stock_reconciliations(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
  FOREIGN KEY (stock_transaction_id) REFERENCES stock_transactions(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_reconciliation (reconciliation_id),
  INDEX idx_ingredient (ingredient_id),
  INDEX idx_adjustment_made (adjustment_made)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual items in stock reconciliation';


-- ============================================
-- Insert default stock locations
-- ============================================
INSERT INTO stock_locations (location_code, location_name, location_type, is_active) VALUES
('MAIN-STORE', 'Main Storage', 'warehouse', TRUE),
('KITCHEN-01', 'Main Kitchen', 'kitchen', TRUE),
('FRIDGE-01', 'Walk-in Refrigerator', 'refrigerator', TRUE),
('FREEZER-01', 'Walk-in Freezer', 'freezer', TRUE),
('DRY-STORE', 'Dry Storage', 'dry_storage', TRUE)
ON DUPLICATE KEY UPDATE location_name = VALUES(location_name);

-- ============================================
-- Create views for reporting
-- ============================================

-- View: Stock movement summary
CREATE OR REPLACE VIEW v_stock_movement_summary AS
SELECT 
  st.ingredient_id,
  i.name AS ingredient_name,
  i.unit,
  DATE(st.transaction_date) AS transaction_day,
  st.transaction_type,
  SUM(st.quantity) AS total_quantity,
  SUM(st.total_cost) AS total_cost,
  COUNT(*) AS transaction_count
FROM stock_transactions st
JOIN ingredients i ON st.ingredient_id = i.id
GROUP BY st.ingredient_id, i.name, i.unit, DATE(st.transaction_date), st.transaction_type;

-- View: Current stock with value
CREATE OR REPLACE VIEW v_current_stock_value AS
SELECT 
  i.id,
  i.name,
  i.unit,
  i.currentStock,
  i.unitCost,
  (i.currentStock * i.unitCost) AS total_value,
  i.reorderLevel,
  CASE 
    WHEN i.currentStock <= i.reorderLevel THEN 'Low Stock'
    WHEN i.currentStock <= (i.reorderLevel * 1.5) THEN 'Warning'
    ELSE 'Normal'
  END AS stock_status,
  ic.name AS category_name,
  i.storageLocation
FROM ingredients i
LEFT JOIN inventory_categories ic ON i.category_id = ic.id
WHERE i.isActive = TRUE;

-- ============================================
-- Success message
-- ============================================
SELECT 'Stock Management System tables created successfully!' AS message;
