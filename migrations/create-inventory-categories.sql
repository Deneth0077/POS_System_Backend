-- Migration: Create Inventory Categories and Kitchen Relations
-- Description: Adds inventory categorization and kitchen assignment functionality
-- Date: 2026-01-09

-- Create inventory categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) COMMENT 'Icon identifier for UI',
  color VARCHAR(7) COMMENT 'Hex color code for display',
  parent_category_id INT DEFAULT NULL COMMENT 'For sub-categories',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL,
  INDEX idx_parent_category (parent_category_id),
  INDEX idx_is_active (is_active),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create kitchen-category relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS kitchen_inventory_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kitchen_station_id INT NOT NULL,
  inventory_category_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE COMMENT 'Is this the primary kitchen for this category',
  priority INT DEFAULT 0 COMMENT 'Display priority',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kitchen_station_id) REFERENCES kitchen_stations(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_category_id) REFERENCES inventory_categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_kitchen_category (kitchen_station_id, inventory_category_id),
  INDEX idx_kitchen_station (kitchen_station_id),
  INDEX idx_inventory_category (inventory_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add category_id to ingredients table (only if it doesn't exist)
SET @dbname = DATABASE();
SET @tablename = 'ingredients';
SET @columnname = 'category_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD COLUMN category_id INT DEFAULT NULL AFTER category'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add kitchen_station_id to ingredients table (only if it doesn't exist)
SET @columnname = 'kitchen_station_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD COLUMN kitchen_station_id INT DEFAULT NULL AFTER category_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key constraints (if they don't exist)
SET @constraint_name = 'fk_ingredient_category';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND CONSTRAINT_NAME = @constraint_name
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD CONSTRAINT fk_ingredient_category FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @constraint_name = 'fk_ingredient_kitchen';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND CONSTRAINT_NAME = @constraint_name
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD CONSTRAINT fk_ingredient_kitchen FOREIGN KEY (kitchen_station_id) REFERENCES kitchen_stations(id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add indexes for performance (if they don't exist)
SET @index_name = 'idx_category_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @index_name
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD INDEX idx_category_id (category_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @index_name = 'idx_kitchen_station_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @index_name
  ) > 0,
  'SELECT 1',
  'ALTER TABLE ingredients ADD INDEX idx_kitchen_station_id (kitchen_station_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Insert default inventory categories (if not already present)
INSERT INTO inventory_categories (name, code, description, icon, color, created_at, updated_at) 
SELECT * FROM (
  SELECT 'Vegetables' as name, 'VEG' as code, 'Fresh and frozen vegetables' as description, '🥬' as icon, '#4CAF50' as color, NOW() as created_at, NOW() as updated_at UNION ALL
  SELECT 'Fruits', 'FRT', 'Fresh and frozen fruits', '🍎', '#FF9800', NOW(), NOW() UNION ALL
  SELECT 'Spices', 'SPC', 'Spices and seasonings', '🌶️', '#F44336', NOW(), NOW() UNION ALL
  SELECT 'Flavours', 'FLV', 'Flavoring agents and extracts', '🧂', '#9C27B0', NOW(), NOW() UNION ALL
  SELECT 'Dairy', 'DRY', 'Milk, cheese, butter, and dairy products', '🧀', '#2196F3', NOW(), NOW() UNION ALL
  SELECT 'Meat', 'MET', 'Fresh and frozen meats', '🥩', '#E91E63', NOW(), NOW() UNION ALL
  SELECT 'Seafood', 'SEA', 'Fresh and frozen seafood', '🦐', '#00BCD4', NOW(), NOW() UNION ALL
  SELECT 'Grains', 'GRN', 'Rice, flour, pasta, and grains', '🌾', '#FFC107', NOW(), NOW() UNION ALL
  SELECT 'Beverages', 'BEV', 'Drinks, juices, and beverage ingredients', '🥤', '#673AB7', NOW(), NOW() UNION ALL
  SELECT 'Oils', 'OIL', 'Cooking oils and fats', '🫒', '#FF5722', NOW(), NOW() UNION ALL
  SELECT 'Sauces', 'SAU', 'Sauces, condiments, and dressings', '🥫', '#795548', NOW(), NOW() UNION ALL
  SELECT 'Bakery', 'BAK', 'Bread, pastries, and baking ingredients', '🍞', '#FFEB3B', NOW(), NOW() UNION ALL
  SELECT 'Herbs', 'HRB', 'Fresh and dried herbs', '🌿', '#8BC34A', NOW(), NOW() UNION ALL
  SELECT 'Nuts & Seeds', 'NUT', 'Various nuts and seeds', '🥜', '#D84315', NOW(), NOW() UNION ALL
  SELECT 'Canned Goods', 'CAN', 'Canned and preserved items', '🥫', '#607D8B', NOW(), NOW() UNION ALL
  SELECT 'Frozen Items', 'FRZ', 'Frozen food items', '❄️', '#03A9F4', NOW(), NOW() UNION ALL
  SELECT 'Desserts', 'DES', 'Dessert ingredients and components', '🍰', '#E91E63', NOW(), NOW() UNION ALL
  SELECT 'Cleaning', 'CLN', 'Cleaning supplies and materials', '🧹', '#9E9E9E', NOW(), NOW() UNION ALL
  SELECT 'Packaging', 'PKG', 'Packaging materials and containers', '📦', '#757575', NOW(), NOW() UNION ALL
  SELECT 'Other', 'OTH', 'Other miscellaneous items', '📌', '#424242', NOW(), NOW()
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE code = tmp.code);

-- Assign categories to kitchen stations (examples based on your kitchen setup)
-- Main Kitchen - handles most categories
INSERT IGNORE INTO kitchen_inventory_categories (kitchen_station_id, inventory_category_id, is_primary, priority, created_at, updated_at) 
SELECT ks.id, ic.id, TRUE, 1, NOW(), NOW()
FROM kitchen_stations ks
CROSS JOIN inventory_categories ic
WHERE ks.code = 'MAIN' 
AND ic.code IN ('VEG', 'MET', 'SEA', 'GRN', 'OIL', 'SAU', 'SPC', 'HRB', 'DRY');

-- Grill Station - grilled items
INSERT IGNORE INTO kitchen_inventory_categories (kitchen_station_id, inventory_category_id, is_primary, priority, created_at, updated_at)
SELECT ks.id, ic.id, TRUE, 1, NOW(), NOW()
FROM kitchen_stations ks
CROSS JOIN inventory_categories ic
WHERE ks.code = 'GRILL'
AND ic.code IN ('MET', 'SEA', 'VEG', 'OIL', 'SPC');

-- Beverage Station - drinks
INSERT IGNORE INTO kitchen_inventory_categories (kitchen_station_id, inventory_category_id, is_primary, priority, created_at, updated_at)
SELECT ks.id, ic.id, TRUE, 1, NOW(), NOW()
FROM kitchen_stations ks
CROSS JOIN inventory_categories ic
WHERE ks.code = 'BEV'
AND ic.code IN ('BEV', 'FRT', 'FLV', 'DRY');

-- Dessert Station - desserts
INSERT IGNORE INTO kitchen_inventory_categories (kitchen_station_id, inventory_category_id, is_primary, priority, created_at, updated_at)
SELECT ks.id, ic.id, TRUE, 1, NOW(), NOW()
FROM kitchen_stations ks
CROSS JOIN inventory_categories ic
WHERE ks.code = 'DESS'
AND ic.code IN ('DES', 'BAK', 'DRY', 'FRT', 'NUT');

-- Salad & Cold Station - cold items
INSERT IGNORE INTO kitchen_inventory_categories (kitchen_station_id, inventory_category_id, is_primary, priority, created_at, updated_at)
SELECT ks.id, ic.id, TRUE, 1, NOW(), NOW()
FROM kitchen_stations ks
CROSS JOIN inventory_categories ic
WHERE ks.code = 'COLD'
AND ic.code IN ('VEG', 'FRT', 'SAU', 'NUT', 'HRB', 'DRY');

-- Note: Run this migration after ensuring kitchen_stations table exists
-- You may need to adjust kitchen station codes based on your actual data
