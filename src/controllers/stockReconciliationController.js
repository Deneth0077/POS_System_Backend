const {
    StockReconciliation,
    StockReconciliationItem,
    Ingredient,
    StockTransaction,
    sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Start a new stock reconciliation
 * @route   POST /api/stock/reconciliation/start
 * @access  Private
 */
exports.startReconciliation = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { location, notes } = req.body;

        // Check for existing in-progress reconciliation
        const existing = await StockReconciliation.findOne({
            where: { status: 'in_progress' },
            transaction
        });

        if (existing) {
            await transaction.rollback();
            return res.status(400).json({ error: 'A reconciliation is already in progress' });
        }

        const reconciliationNumber = await StockReconciliation.generateReconciliationNumber();

        const reconciliation = await StockReconciliation.create({
            reconciliationNumber,
            reconciliationDate: new Date(),
            location: location || 'Warehouse',
            status: 'in_progress',
            performedBy: req.user.id,
            notes
        }, { transaction });

        // Snapshot all ingredients
        const ingredients = await Ingredient.findAll({ transaction });

        const items = ingredients.map(ing => ({
            reconciliationId: reconciliation.id,
            ingredientId: ing.id,
            systemStock: ing.currentStock,
            physicalStock: ing.currentStock, // Default to system stock
            difference: 0,
            unit: ing.unit,
            unitCost: ing.unitCost || 0,
            valueDifference: 0
        }));

        await StockReconciliationItem.bulkCreate(items, { transaction });

        await transaction.commit();
        res.status(201).json({ success: true, reconciliation });
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get active reconciliation
 * @route   GET /api/stock/reconciliation/active
 * @access  Private
 */
exports.getActiveReconciliation = async (req, res) => {
    try {
        const reconciliation = await StockReconciliation.findOne({
            where: { status: 'in_progress' },
            include: [{
                model: StockReconciliationItem,
                include: [{ model: Ingredient }]
            }]
        });

        res.status(200).json({ reconciliation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Update reconciliation items
 * @route   POST /api/stock/reconciliation/update
 * @access  Private
 */
exports.updateItems = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { items } = req.body; // Array of { id: reconciliationItemId, physicalStock: number, notes: string }

        for (const item of items) {
            const recItem = await StockReconciliationItem.findByPk(item.id, { transaction });
            if (recItem) {
                const physicalStock = parseFloat(item.physicalStock);
                const difference = physicalStock - parseFloat(recItem.systemStock);
                const valueDifference = difference * (recItem.unitCost || 0);

                await recItem.update({
                    physicalStock,
                    difference,
                    valueDifference,
                    notes: item.notes
                }, { transaction });
            }
        }

        await transaction.commit();
        res.status(200).json({ success: true });
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Submit reconciliation for approval
 * @route   POST /api/stock/reconciliation/:id/submit
 * @access  Private
 */
exports.submitReconciliation = async (req, res) => {
    try {
        const reconciliation = await StockReconciliation.findByPk(req.params.id);
        if (!reconciliation) return res.status(404).json({ error: 'Not found' });

        // Calculate totals
        const items = await StockReconciliationItem.findAll({
            where: { reconciliationId: reconciliation.id }
        });

        let totalItemsCounted = 0;
        let totalDiscrepancies = 0;
        let totalValueDifference = 0;

        items.forEach(item => {
            totalItemsCounted++;
            if (Math.abs(item.difference) > 0.0001) {
                totalDiscrepancies++;
            }
            totalValueDifference += parseFloat(item.valueDifference || 0);
        });

        await reconciliation.update({
            status: 'completed',
            totalItemsCounted,
            totalDiscrepancies,
            totalValueDifference,
            completedAt: new Date()
        });

        res.status(200).json({ success: true, reconciliation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Approve and apply reconciliation
 * @route   POST /api/stock/reconciliation/:id/approve
 * @access  Private (Admin/Manager)
 */
exports.approveReconciliation = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const reconciliation = await StockReconciliation.findByPk(req.params.id, {
            include: [StockReconciliationItem],
            transaction
        });

        if (!reconciliation || reconciliation.status !== 'completed') {
            return res.status(400).json({ error: 'Reconciliation must be completed before approval' });
        }

        // Process each item
        for (const item of reconciliation.StockReconciliationItems) {
            if (Math.abs(item.difference) > 0.0001) {
                const ingredient = await Ingredient.findByPk(item.ingredientId, { transaction });

                // Create stock transaction for adjustment
                const txNumber = await StockTransaction.generateTransactionNumber();
                const tx = await StockTransaction.create({
                    transactionNumber: txNumber,
                    ingredientId: item.ingredientId,
                    transactionType: 'adjustment',
                    quantity: item.difference,
                    unitCost: item.unitCost,
                    totalCost: item.valueDifference,
                    storageLocation: reconciliation.location,
                    notes: `Reconciliation #${reconciliation.reconciliationNumber}: ${item.notes || 'Discrepancy correction'}`,
                    performedBy: reconciliation.performedBy
                }, { transaction });

                // Update ingredient currentStock
                await ingredient.update({
                    currentStock: item.physicalStock
                }, { transaction });

                // Link item to transaction
                await item.update({
                    stockTransactionId: tx.id,
                    adjustmentMade: true
                }, { transaction });
            }
        }

        await reconciliation.update({
            status: 'approved',
            approvedBy: req.user.id,
            approvedAt: new Date()
        }, { transaction });

        await transaction.commit();
        res.status(200).json({ success: true });
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ error: err.message });
    }
};
