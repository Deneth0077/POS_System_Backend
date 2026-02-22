const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getMenuItemsByCategory,
  getCategories,
  getMenuItemsByKitchen
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItemIngredient:
 *       type: object
 *       properties:
 *         productId:
 *           type: integer
 *           example: 15
 *         quantity:
 *           type: number
 *           format: decimal
 *           example: 200
 *         unit:
 *           type: string
 *           example: "g"
 *         notes:
 *           type: string
 *           example: "Basmati rice"
 *     MenuItemPortion:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Full"
 *         price:
 *           type: number
 *           format: decimal
 *           example: 500
 *         costPrice:
 *           type: number
 *           format: decimal
 *           example: 250
 *         isDefault:
 *           type: boolean
 *           example: true
 *         displayOrder:
 *           type: integer
 *           example: 1
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MenuItemIngredient'
 *     MenuItem:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - kitchenStationId
 *         - portions
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [starters, mains, desserts, beverages, sides, specials]
 *         price:
 *           type: number
 *           format: decimal
 *           description: Base price (optional if portions are used)
 *         costPrice:
 *           type: number
 *           format: decimal
 *         imageUrl:
 *           type: string
 *         preparationTime:
 *           type: integer
 *         calories:
 *           type: integer
 *         isVegetarian:
 *           type: boolean
 *         isVegan:
 *           type: boolean
 *         isGlutenFree:
 *           type: boolean
 *         spicyLevel:
 *           type: string
 *           enum: [none, mild, medium, hot, extra-hot]
 *         isAvailable:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         displayOrder:
 *           type: integer
 *         taxable:
 *           type: boolean
 *         kitchenStationId:
 *           type: integer
 *           description: REQUIRED - Must select kitchen before adding menu item
 *         portions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MenuItemPortion'
 *     MenuItemCreateRequest:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - kitchenStationId
 *         - portions
 *       properties:
 *         name:
 *           type: string
 *           example: "Fried Rice"
 *         description:
 *           type: string
 *           example: "Delicious fried rice with vegetables"
 *         category:
 *           type: string
 *           enum: [starters, mains, desserts, beverages, sides, specials]
 *           example: "mains"
 *         kitchenStationId:
 *           type: integer
 *           example: 2
 *           description: Kitchen station ID (REQUIRED)
 *         imageUrl:
 *           type: string
 *           example: "https://example.com/fried-rice.jpg"
 *         preparationTime:
 *           type: integer
 *           example: 15
 *         isVegetarian:
 *           type: boolean
 *           example: true
 *         isVegan:
 *           type: boolean
 *           example: false
 *         taxable:
 *           type: boolean
 *           example: true
 *         portions:
 *           type: array
 *           description: At least one portion required
 *           items:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Full"
 *               price:
 *                 type: number
 *                 example: 500
 *               costPrice:
 *                 type: number
 *                 example: 250
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 10
 *                     quantity:
 *                       type: number
 *                       example: 200
 *                     unit:
 *                       type: string
 *                       example: "g"
 *                     notes:
 *                       type: string
 *                       example: "Basmati rice"
 */

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of menu items grouped by category
 */
router.get('/', apiLimiter, getMenuItems);

/**
 * @swagger
 * /api/menu/categories:
 *   get:
 *     summary: Get all menu categories
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', apiLimiter, getCategories);

/**
 * @swagger
 * /api/menu/category/{category}:
 *   get:
 *     summary: Get menu items by category
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu items in the category
 */
router.get('/category/:category', apiLimiter, getMenuItemsByCategory);

/**
 * @swagger
 * /api/menu/kitchen/{kitchenStationId}:
 *   get:
 *     summary: Get menu items by kitchen station
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: kitchenStationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Menu items for the kitchen station
 */
router.get('/kitchen/:kitchenStationId', apiLimiter, getMenuItemsByKitchen);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Menu item details
 *       404:
 *         description: Menu item not found
 */
router.get('/:id', apiLimiter, getMenuItemById);

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Create new menu item with portions and ingredients
 *     description: |
 *       Create a menu item with multiple portions and ingredient tracking.
 *       **Required Steps:**
 *       1. Select kitchen station first (kitchenStationId required)
 *       2. Add basic menu item info
 *       3. Define at least one portion (Full, Half, etc.)
 *       4. Add ingredients for each portion from inventory products
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemCreateRequest'
 *           examples:
 *             friedRice:
 *               summary: Fried Rice with portions
 *               value:
 *                 name: "Chicken Fried Rice"
 *                 description: "Stir-fried rice with chicken and vegetables"
 *                 category: "mains"
 *                 kitchenStationId: 2
 *                 imageUrl: "https://example.com/fried-rice.jpg"
 *                 preparationTime: 15
 *                 isVegetarian: false
 *                 taxable: true
 *                 portions:
 *                   - name: "Full"
 *                     price: 500
 *                     costPrice: 250
 *                     isDefault: true
 *                     displayOrder: 1
 *                     ingredients:
 *                       - productId: 10
 *                         quantity: 200
 *                         unit: "g"
 *                         notes: "Basmati rice"
 *                       - productId: 15
 *                         quantity: 100
 *                         unit: "g"
 *                         notes: "Chicken pieces"
 *                       - productId: 20
 *                         quantity: 50
 *                         unit: "ml"
 *                         notes: "Vegetable oil"
 *                   - name: "Half"
 *                     price: 300
 *                     costPrice: 150
 *                     isDefault: false
 *                     displayOrder: 2
 *                     ingredients:
 *                       - productId: 10
 *                         quantity: 100
 *                         unit: "g"
 *                         notes: "Basmati rice"
 *                       - productId: 15
 *                         quantity: 50
 *                         unit: "g"
 *                         notes: "Chicken pieces"
 *                       - productId: 20
 *                         quantity: 25
 *                         unit: "ml"
 *                         notes: "Vegetable oil"
 *     responses:
 *       201:
 *         description: Menu item created successfully with portions and ingredients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Menu item created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Kitchen station is required before creating menu item"
 */
router.post('/', protect, authorize('Admin', 'Manager'), apiLimiter, createMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Update menu item with portions and ingredients
 *     description: Update menu item including portions and ingredients. All portions will be replaced.
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemCreateRequest'
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 */
router.put('/:id', protect, authorize('Admin', 'Manager'), apiLimiter, updateMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Delete menu item
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 */
router.delete('/:id', protect, authorize('Admin'), apiLimiter, deleteMenuItem);

/**
 * @swagger
 * /api/menu/{id}/availability:
 *   patch:
 *     summary: Toggle menu item availability
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
router.patch('/:id/availability', protect, authorize('Admin', 'Manager'), apiLimiter, toggleAvailability);

module.exports = router;
