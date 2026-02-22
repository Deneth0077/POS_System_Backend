const syncService = require('../services/syncService');

// @desc    Sync offline sales to server
// @route   POST /api/sync/offline-sales
// @access  Private (Cashier, Manager, Admin)
exports.syncOfflineSales = async (req, res, next) => {
  try {
    const { sales } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sales array is required and must not be empty'
      });
    }

    // Sync the offline sales
    const result = await syncService.syncOfflineSales(sales, req.user);

    res.status(200).json({
      success: true,
      message: `Synced ${result.successful} out of ${result.total} sales`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unsynced sales
// @route   GET /api/sync/unsynced-sales
// @access  Private (Manager, Admin)
exports.getUnsyncedSales = async (req, res, next) => {
  try {
    const unsyncedSales = await syncService.getUnsyncedSales();

    res.status(200).json({
      success: true,
      count: unsyncedSales.length,
      data: unsyncedSales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync inventory updates
// @route   POST /api/sync/inventory
// @access  Private (Manager, Admin)
exports.syncInventory = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const result = await syncService.syncInventory(updates);

    res.status(200).json({
      success: true,
      message: `Synced ${result.successful} out of ${result.total} inventory updates`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory snapshot for offline sync
// @route   GET /api/sync/inventory-snapshot
// @access  Private (Cashier, Manager, Admin)
exports.getInventorySnapshot = async (req, res, next) => {
  try {
    const snapshot = await syncService.getInventorySnapshot();

    res.status(200).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    next(error);
  }
};
