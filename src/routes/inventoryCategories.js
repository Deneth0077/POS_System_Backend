const express = require('express');
const router = express.Router();
const inventoryCategoryController = require('../controllers/inventoryCategoryController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Category CRUD routes
router.get('/', inventoryCategoryController.getAllCategories);
router.get('/:id', inventoryCategoryController.getCategoryById);
router.post('/', authorize('admin', 'manager'), inventoryCategoryController.createCategory);
router.put('/:id', authorize('admin', 'manager'), inventoryCategoryController.updateCategory);
router.delete('/:id', authorize('admin', 'manager'), inventoryCategoryController.deleteCategory);

// Kitchen-Category assignment routes
router.get('/kitchen/:kitchenId', inventoryCategoryController.getCategoriesByKitchen);
router.post('/assign', authorize('admin', 'manager'), inventoryCategoryController.assignCategoryToKitchen);
router.delete('/assign/:categoryId/:kitchenStationId', authorize('admin', 'manager'), inventoryCategoryController.removeCategoryFromKitchen);

module.exports = router;
