/**
 * Menu Categories Configuration
 * Defines the standard menu categories for restaurant menu items
 */

const MENU_CATEGORIES = {
  STARTERS: 'starters',
  MAINS: 'mains',
  DESSERTS: 'desserts',
  BEVERAGES: 'beverages'
};

// Array of all valid menu categories
const VALID_MENU_CATEGORIES = Object.values(MENU_CATEGORIES);

// Category descriptions for API documentation
const CATEGORY_DESCRIPTIONS = {
  [MENU_CATEGORIES.STARTERS]: 'Appetizers and starter dishes',
  [MENU_CATEGORIES.MAINS]: 'Main course dishes',
  [MENU_CATEGORIES.DESSERTS]: 'Desserts and sweet items',
  [MENU_CATEGORIES.BEVERAGES]: 'Drinks and beverages'
};

/**
 * Validate if a category is valid
 * @param {string} category - Category to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCategory = (category) => {
  return VALID_MENU_CATEGORIES.includes(category);
};

module.exports = {
  MENU_CATEGORIES,
  VALID_MENU_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  isValidCategory
};
