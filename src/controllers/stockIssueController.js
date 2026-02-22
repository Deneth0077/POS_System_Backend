const {
    StockIssue,
    MenuItem,
    MenuItemIngredient,
    MenuItemPortion,
    Ingredient,
    StockLocation,
    StockTransaction,
    User,
    sequelize
} = require('../models');
const { Op } = require('sequelize');

// Helper: Calculate stock for a specific location based on transaction history
// This is critical because the system uses strings for locations in StockTransaction
// but IDs in StockLocation.
async function calculateLocationStock(ingredientId, locationName, transaction = null) {
    const opts = { transaction };

    // Sum all additions to this location
    const inward = await StockTransaction.sum('quantity', {
        where: {
            ingredientId,
            toLocation: locationName,
            status: 'completed'
        },
        ...opts
    }) || 0;

    // Sum all deductions from this location (stored as negative or positive? usually negative for deductions)
    // Checking seed script: 'transfer_out' quantity was negative (-qtyToTransfer).
    // So simple Sum will work if they are negative.
    // However, 'transfer_out' records have fromLocation set to the source.
    // So we need to sum quantity where fromLocation == locationName.
    // Wait, if it's negative in the DB, summing 'fromLocation' rows will give a negative number.
    // So Balance = Inward (toLocation) + Outward (fromLocation).
    // Let's verify 'add_stock' (opening balance). It has toLocation='Main Warehouse'. Positive.
    // 'transfer_out'. quantity is -10. fromLocation='Main Warehouse'.
    // So simply summing all transactions where (toLocation = Name OR fromLocation = Name) should give the balance?
    // Case 1: Add 100 to Warehouse. (to=WH, qty=100). Sum=100.
    // Case 2: Transfer 20 out. (from=WH, qty=-20).
    // Query: Sum(qty) where to=WH OR from=WH?
    // If I sum `from=WH`, I get -20.
    // Total = 100 + (-20) = 80. Correct.

    // However, let's be precise.
    // We need to handle cases where quantity might be stored positively for some 'out' transactions if logic differs.
    // Seed script explicitly set negative for transfer_out.
    // Let's assume consistent negative usage for deductions from a source.

    const balance = await StockTransaction.sum('quantity', {
        where: {
            ingredientId,
            [Op.or]: [
                { toLocation: locationName },
                { fromLocation: locationName }
            ],
            status: 'completed' // only confirmed stock
        },
        ...opts
    });

    return balance || 0;
}

exports.createStockIssue = async (req, res) => {
    try {
        const {
            menuItemId,
            portionId,
            plannedQuantity,
            fromLocationId,
            toLocationId,
            notes
        } = req.body;

        // Validation
        if (!menuItemId || !plannedQuantity || !fromLocationId || !toLocationId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get details (checking connection)
        const menuItem = await MenuItem.findByPk(menuItemId);
        if (!menuItem) return res.status(404).json({ message: 'Menu Item not found' });

        const fromLoc = await StockLocation.findByPk(fromLocationId);
        const toLoc = await StockLocation.findByPk(toLocationId);
        if (!fromLoc || !toLoc) return res.status(404).json({ message: 'Location not found' });

        const stockIssue = await StockIssue.create({
            menuItemId,
            portionId: portionId || null,
            plannedQuantity,
            fromLocationId,
            toLocationId,
            notes,
            requestedBy: req.user.id, // Auth middleware required
            status: 'pending'
        });

        // Fetch with Includes for return
        const created = await StockIssue.findByPk(stockIssue.id, {
            include: [
                { model: MenuItem, as: 'menuItem' },
                { model: StockLocation, as: 'fromLocation' },
                { model: StockLocation, as: 'toLocation' }
            ]
        });

        // Calculate and attach expected ingredients for preview
        const ingredients = await exports.calculateRequiredIngredientsInternal(menuItemId, portionId, plannedQuantity);

        res.status(201).json({
            message: 'Stock Issue Request Created',
            data: created,
            projectedIngredients: ingredients
        });
    } catch (error) {
        console.error('Create Stock Issue Error:', error);
        res.status(500).json({ message: 'Error creating stock issue', error: error.message });
    }
};

exports.calculateRequiredIngredientsInternal = async (menuItemId, portionId, quantity) => {
    // Find recipe
    const where = { menuItemId };
    if (portionId) where.portionId = portionId;

    // Note: If portionId is null, we might pull ingredients mapped without portion?
    // Seed script mapped ingredients with portionId.
    // If user sends portionId, usage is specific.
    // If not, we might default to 'regular' or fail?
    // Let's try to be flexible.

    const recipeItems = await MenuItemIngredient.findAll({
        where,
        include: [{ model: Ingredient, as: 'ingredient' }]
    });

    return recipeItems.map(item => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient?.name,
        unit: item.unit,
        quantityPerUnit: parseFloat(item.quantity),
        totalRequired: parseFloat(item.quantity) * parseFloat(quantity),
        currentStock: item.ingredient?.currentStock // Global stock, for reference
    }));
};

exports.getStockIssuePreview = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await StockIssue.findByPk(id, {
            include: ['menuItem', 'portion', 'fromLocation', 'toLocation', 'requester']
        });
        if (!issue) return res.status(404).json({ message: 'Stock Issue not found' });

        const ingredients = await exports.calculateRequiredIngredientsInternal(
            issue.menuItemId,
            issue.portionId,
            issue.plannedQuantity
        );

        // Enhance with LOCATION SPECIFIC availability
        const enhancedIngredients = await Promise.all(ingredients.map(async ing => {
            const locationStock = await calculateLocationStock(ing.ingredientId, issue.fromLocation.locationName);
            return {
                ...ing,
                locationStock: parseFloat(locationStock),
                available: parseFloat(locationStock) >= ing.totalRequired
            };
        }));

        res.json({
            issue,
            requirements: enhancedIngredients
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching preview', error: error.message });
    }
};

exports.confirmStockIssue = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const issue = await StockIssue.findByPk(id, {
            include: ['fromLocation', 'toLocation'],
            transaction: t
        });

        if (!issue) {
            await t.rollback();
            return res.status(404).json({ message: 'Stock Issue not found' });
        }

        if (issue.status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ message: `Cannot confirm issue with status: ${issue.status}` });
        }

        // 1. Calculate Requirements
        const requirements = await exports.calculateRequiredIngredientsInternal(
            issue.menuItemId,
            issue.portionId,
            issue.plannedQuantity
        );

        // 2. Validate Stock & Prepare Transactions
        for (const reqItem of requirements) {
            // Check availability in FROM location
            const currentLocStock = await calculateLocationStock(reqItem.ingredientId, issue.fromLocation.locationName, t);

            if (currentLocStock < reqItem.totalRequired) {
                await t.rollback();
                return res.status(400).json({
                    message: `Insufficient stock for ${reqItem.ingredientName} in ${issue.fromLocation.locationName}. Required: ${reqItem.totalRequired}, Available: ${currentLocStock}`
                });
            }
        }

        // 3. Execute Transfers
        const txNumberOut = await StockTransaction.generateTransactionNumber(); // Helper likely needed inside loop or safe reuse?
        // generateTransactionNumber is async and checks DB. 
        // Calling it twice might result in collision if not careful/locked?
        // Better: generate one, then increment manually or assume robust.
        // Actually, we need unique IDs for every transaction row.

        let txCounter = 0;
        const baseTxNum = await StockTransaction.generateTransactionNumber();
        const getTxNum = () => `${baseTxNum}-${++txCounter}`; // Simple suffixing to ensure uniqueness in batch

        for (const reqItem of requirements) {
            const ingredient = await Ingredient.findByPk(reqItem.ingredientId, { transaction: t });

            // A. Deduct from Source
            await StockTransaction.create({
                transactionNumber: getTxNum(),
                transactionType: 'transfer_out',
                ingredientId: ingredient.id,
                quantity: -reqItem.totalRequired, // Negative for deduction
                unit: reqItem.unit,
                previousStock: 0, // Not strictly tracking accumulated previous stock here relies on currentStock which is global
                newStock: 0,    // See note below
                fromLocation: issue.fromLocation.locationName,
                toLocation: issue.toLocation.locationName, // It went here
                referenceType: 'stock_issue',
                referenceId: issue.id,
                status: 'completed',
                performedBy: req.user.id,
                notes: `Production Issue: ${issue.issueNumber}`
            }, { transaction: t });

            // B. Add to Target
            await StockTransaction.create({
                transactionNumber: getTxNum(),
                transactionType: 'transfer_in',
                ingredientId: ingredient.id,
                quantity: reqItem.totalRequired,
                unit: reqItem.unit,
                previousStock: 0,
                newStock: 0,
                fromLocation: issue.fromLocation.locationName,
                toLocation: issue.toLocation.locationName,
                referenceType: 'stock_issue',
                referenceId: issue.id,
                status: 'completed',
                performedBy: req.user.id,
                notes: `Production Issue Receipt: ${issue.issueNumber}`
            }, { transaction: t });

            // C. Update Global Stock (Cache)
            // Transfer doesn't change global stock total, but for consistency with existing logic:
            // -Deduction +Addition = 0 change. 
            // So we don't technically need to update Ingredient.currentStock unless it differs?
            // Seed logic did update it. Let's strictly follow seed logic: valid updates.
            // But doing -10 then +10 cancels out.
            // I will skip Ingredient.update() because it serves no functional purpose for a zero-sum transfer 
            // and avoids race conditions on the global counter.
        }

        // 4. Update Issue Status
        await issue.update({
            status: 'confirmed',
            confirmedBy: req.user.id,
            confirmedAt: new Date()
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Stock Issue Confirmed successfully', issueId: issue.id });

    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('Confirm Issue Error:', error);
        res.status(500).json({ message: 'Confirm failed', error: error.message });
    }
};

exports.listStockIssues = async (req, res) => {
    try {
        const issues = await StockIssue.findAll({
            include: [
                { model: MenuItem, as: 'menuItem', attributes: ['name'] },
                { model: StockLocation, as: 'fromLocation', attributes: ['locationName'] },
                { model: StockLocation, as: 'toLocation', attributes: ['locationName'] },
                { model: User, as: 'requester', attributes: ['username', 'fullName'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error listing issues', error: error.message });
    }
};

exports.cancelStockIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await StockIssue.findByPk(id);

        if (!issue) return res.status(404).json({ message: 'Issue not found' });
        if (issue.status !== 'pending') return res.status(400).json({ message: 'Only pending issues can be cancelled' });

        await issue.update({ status: 'cancelled' });
        res.json({ message: 'Issue cancelled' });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling issue', error: error.message });
    }
};
