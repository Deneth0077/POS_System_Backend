-- Migration: Add ingredient_id to menu_item_ingredients table
-- Date: 2026-01-07
-- Description: Link menu item ingredients to actual inventory ingredients for stock tracking

-- Add ingredient_id column to menu_item_ingredients table
ALTER TABLE menu_item_ingredients
ADD COLUMN ingredient_id INT NULL COMMENT 'ID of the inventory ingredient for stock tracking'
AFTER product_id;

-- Add foreign key constraint
ALTER TABLE menu_item_ingredients
ADD CONSTRAINT fk_menu_item_ingredients_ingredient
FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
ON DELETE RESTRICT;

-- Add index for faster lookups
ALTER TABLE menu_item_ingredients
ADD INDEX idx_ingredient_id (ingredient_id);

-- Update menu_item_id column reference
ALTER TABLE menu_item_ingredients
ADD COLUMN menu_item_id INT NULL COMMENT 'Direct reference to menu item (alternative to using portion_id)'
AFTER id;

-- Add foreign key for menu_item_id
ALTER TABLE menu_item_ingredients
ADD CONSTRAINT fk_menu_item_ingredients_menu_item
FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
ON DELETE CASCADE;

-- Add index for menu_item_id
ALTER TABLE menu_item_ingredients
ADD INDEX idx_menu_item_id (menu_item_id);
