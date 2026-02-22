const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/expenses', authorize('Admin', 'Manager', 'Owner'), financialController.getExpenses);
router.post('/expenses', authorize('Admin', 'Manager'), financialController.createExpense);
router.get('/expenses/stats', authorize('Admin', 'Manager', 'Owner'), financialController.getExpenseStats);

module.exports = router;
