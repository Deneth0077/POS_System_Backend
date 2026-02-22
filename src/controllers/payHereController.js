const payHereService = require('../services/payHereService');

// @desc    Prepare PayHere checkout data
// @route   POST /api/payments/payhere/checkout
// @access  Private
exports.prepareCheckout = async (req, res, next) => {
    try {
        const checkoutData = await payHereService.prepareCheckoutData(req.body);
        res.status(200).json({
            success: true,
            data: checkoutData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Handle PayHere payment notification
// @route   POST /api/payments/payhere/notify
// @access  Public (Webhook)
exports.handleNotification = async (req, res, next) => {
    try {
        console.log('=== PayHere Notification Received ===', req.body);
        const result = await payHereService.verifyNotification(req.body);
        res.status(200).json(result);
    } catch (error) {
        console.error('PayHere Notification Error:', error.message);
        res.status(400).send(error.message);
    }
};
