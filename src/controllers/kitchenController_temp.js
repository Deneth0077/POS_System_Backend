
// @desc    Get completed kitchen orders
// @route   GET /api/kitchen/orders/completed
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getCompletedOrders = async (req, res, next) => {
    try {
        const filters = {
            kitchenStationId: req.query.kitchenStationId ? parseInt(req.query.kitchenStationId) : null
        };

        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setHours(0, 0, 0, 0));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        const orders = await KitchenOrder.findAll({
            where: {
                status: 'completed',
                ...(filters.kitchenStationId && { kitchenStationId: filters.kitchenStationId }),
                updatedAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Sale,
                as: 'sale',
                attributes: ['saleNumber', 'totalAmount', 'cashierName']
            }],
            order: [['updatedAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};
