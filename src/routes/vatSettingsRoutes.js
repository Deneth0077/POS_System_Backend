const express = require('express');
const router = express.Router();
const vatSettingsController = require('../controllers/vatSettingsController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     VATSettings:
 *       type: object
 *       required:
 *         - defaultRate
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID
 *         isEnabled:
 *           type: boolean
 *           description: Enable/disable VAT globally
 *         defaultRate:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           maximum: 1
 *           description: Default VAT rate (e.g., 0.15 for 15%)
 *         calculationMethod:
 *           type: string
 *           enum: [INCLUSIVE, EXCLUSIVE, COMPOUND, SPLIT_RATE, TIERED]
 *           description: VAT calculation method
 *         displayOnReceipt:
 *           type: boolean
 *           description: Show VAT breakdown on receipts
 *         displayLabel:
 *           type: string
 *           description: Label to display (VAT, GST, Tax, etc.)
 *         roundingMethod:
 *           type: string
 *           enum: [NEAREST, UP, DOWN, NONE]
 *           description: How to round VAT amounts
 *         roundingPrecision:
 *           type: integer
 *           minimum: 0
 *           maximum: 4
 *           description: Decimal places for rounding
 *         categoryRates:
 *           type: object
 *           description: Category-specific VAT rates (for SPLIT_RATE method)
 *         tieredRates:
 *           type: array
 *           description: Tiered rates by amount (for TIERED method)
 *         exemptCategories:
 *           type: array
 *           description: Product categories exempt from VAT
 *         exemptProducts:
 *           type: array
 *           description: Specific product IDs exempt from VAT
 *         taxRegistrationNumber:
 *           type: string
 *           description: Government VAT registration number
 *         complianceRegion:
 *           type: string
 *           description: Country/region for tax compliance
 *         enableServiceCharge:
 *           type: boolean
 *           description: Enable service charge calculation
 *         serviceChargeRate:
 *           type: number
 *           format: decimal
 *           description: Service charge rate if enabled
 *         applyVATOnServiceCharge:
 *           type: boolean
 *           description: Apply VAT on service charge
 *         minimumTaxableAmount:
 *           type: number
 *           format: decimal
 *           description: Minimum transaction amount for VAT
 *         receiptFooter:
 *           type: string
 *           description: Custom footer for receipts
 *         effectiveDate:
 *           type: string
 *           format: date-time
 *           description: When settings become effective
 *         notes:
 *           type: string
 *           description: Administrative notes
 *         isActive:
 *           type: boolean
 *           description: Whether configuration is active
 */

/**
 * @swagger
 * /api/vat-settings/current:
 *   get:
 *     summary: Get current active VAT settings
 *     tags: [VAT Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current VAT settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VATSettings'
 *       404:
 *         description: No active settings found
 */
router.get('/current', authorize('Manager', 'Admin'), vatSettingsController.getCurrentSettings);

/**
 * @swagger
 * /api/vat-settings/presets:
 *   get:
 *     summary: Get VAT configuration presets/templates
 *     tags: [VAT Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available VAT presets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/presets', authorize('Admin'), vatSettingsController.getPresets);

/**
 * @swagger
 * /api/vat-settings/test-calculation:
 *   post:
 *     summary: Test VAT calculation with current settings
 *     tags: [VAT Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Base amount to test
 *               items:
 *                 type: array
 *                 description: Array of items to test
 *     responses:
 *       200:
 *         description: VAT calculation test results
 */
router.post('/test-calculation', authorize('Manager', 'Admin'), vatSettingsController.testCalculation);

/**
 * @swagger
 * /api/vat-settings:
 *   get:
 *     summary: Get all VAT settings (including historical)
 *     tags: [VAT Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All VAT settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VATSettings'
 */
router.get('/', authorize('Admin'), vatSettingsController.getAllSettings);

/**
 * @swagger
 * /api/vat-settings:
 *   post:
 *     summary: Create new VAT settings
 *     tags: [VAT Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VATSettings'
 *     responses:
 *       201:
 *         description: VAT settings created
 *       400:
 *         description: Invalid input
 */
router.post('/', authorize('Admin'), vatSettingsController.createSettings);

/**
 * @swagger
 * /api/vat-settings/{id}:
 *   get:
 *     summary: Get VAT setting by ID
 *     tags: [VAT Settings]
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
 *         description: VAT settings found
 *       404:
 *         description: Settings not found
 */
router.get('/:id', authorize('Manager', 'Admin'), vatSettingsController.getSettingById);

/**
 * @swagger
 * /api/vat-settings/{id}:
 *   put:
 *     summary: Update VAT settings
 *     tags: [VAT Settings]
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
 *             $ref: '#/components/schemas/VATSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 *       404:
 *         description: Settings not found
 */
router.put('/:id', authorize('Admin'), vatSettingsController.updateSettings);

/**
 * @swagger
 * /api/vat-settings/{id}/activate:
 *   put:
 *     summary: Activate specific VAT settings
 *     tags: [VAT Settings]
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
 *         description: Settings activated
 *       404:
 *         description: Settings not found
 */
router.put('/:id/activate', authorize('Admin'), vatSettingsController.activateSettings);

/**
 * @swagger
 * /api/vat-settings/{id}:
 *   delete:
 *     summary: Delete VAT settings
 *     tags: [VAT Settings]
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
 *         description: Settings deleted
 *       400:
 *         description: Cannot delete active settings
 *       404:
 *         description: Settings not found
 */
router.delete('/:id', authorize('Admin'), vatSettingsController.deleteSettings);

module.exports = router;
