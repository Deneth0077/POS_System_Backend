-- Migration: Create menu item portions and ingredients tables
-- Date: 2026-01-07
-- Description: Add support for multiple portions per menu item with ingredient tracking

-- Create menu_item_portions table
CREATE TABLE IF NOT EXISTS menu_item_portions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  menu_item_id INT NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'Portion name: Full, Half, Quarter, etc.',
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NULL,
  is_default BOOLEAN DEFAULT FALSE COMMENT 'Default portion when ordering',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_item_id (menu_item_id),
  INDEX idx_is_active (is_active),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create menu_item_ingredients table
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  portion_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL COMMENT 'Quantity of ingredient needed',
  unit VARCHAR(50) DEFAULT 'piece' COMMENT 'Unit: g, ml, piece, etc.',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (portion_id) REFERENCES menu_item_portions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_portion_id (portion_id),
  INDEX idx_product_id (product_id),
  UNIQUE KEY unique_portion_product (portion_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to menu_items table about portions
ALTER TABLE menu_items 
MODIFY COLUMN kitchen_station_id INT NULL 
COMMENT 'ID of the kitchen station - REQUIRED before adding menu items';
