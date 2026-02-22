const VATSettings = require('../models/VATSettings');
const vatService = require('../services/vatService');

/**
 * VAT Settings Controller
 * Manages customizable VAT configuration for the restaurant
 */

// @desc    Get current active VAT settings
// @route   GET /api/vat-settings/current
// @access  Private (Manager, Admin)
exports.getCurrentSettings = async (req, res) => {
  try {
    const settings = await VATSettings.findOne({
      where: { isActive: true },
      order: [['effectiveDate', 'DESC']]
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'No active VAT settings found. Using default configuration.'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching current VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching VAT settings',
      error: error.message
    });
  }
};

// @desc    Get all VAT settings (including historical)
// @route   GET /api/vat-settings
// @access  Private (Admin)
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await VATSettings.findAll({
      order: [['effectiveDate', 'DESC']]
    });

    res.json({
      success: true,
      count: settings.length,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching VAT settings',
      error: error.message
    });
  }
};

// @desc    Get VAT setting by ID
// @route   GET /api/vat-settings/:id
// @access  Private (Manager, Admin)
exports.getSettingById = async (req, res) => {
  try {
    const settings = await VATSettings.findByPk(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'VAT settings not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching VAT settings',
      error: error.message
    });
  }
};

// @desc    Create new VAT settings
// @route   POST /api/vat-settings
// @access  Private (Admin)
exports.createSettings = async (req, res) => {
  try {
    const {
      isEnabled,
      defaultRate,
      calculationMethod,
      displayOnReceipt,
      displayLabel,
      roundingMethod,
      roundingPrecision,
      categoryRates,
      tieredRates,
      exemptCategories,
      exemptProducts,
      taxRegistrationNumber,
      complianceRegion,
      enableServiceCharge,
      serviceChargeRate,
      applyVATOnServiceCharge,
      minimumTaxableAmount,
      receiptFooter,
      effectiveDate,
      notes,
      isActive
    } = req.body;

    // Validate required fields
    if (defaultRate === undefined || defaultRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Default VAT rate is required'
      });
    }

    // Validate rate range
    if (defaultRate < 0 || defaultRate > 1) {
      return res.status(400).json({
        success: false,
        message: 'VAT rate must be between 0 and 1 (0% to 100%)'
      });
    }

    // If this is set as active, deactivate all others
    if (isActive) {
      await VATSettings.update(
        { isActive: false },
        { where: { isActive: true } }
      );
    }

    const settings = await VATSettings.create({
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      defaultRate,
      calculationMethod: calculationMethod || 'EXCLUSIVE',
      displayOnReceipt: displayOnReceipt !== undefined ? displayOnReceipt : true,
      displayLabel: displayLabel || 'VAT',
      roundingMethod: roundingMethod || 'NEAREST',
      roundingPrecision: roundingPrecision !== undefined ? roundingPrecision : 2,
      categoryRates: categoryRates || {},
      tieredRates: tieredRates || [],
      exemptCategories: exemptCategories || [],
      exemptProducts: exemptProducts || [],
      taxRegistrationNumber,
      complianceRegion: complianceRegion || 'Sri Lanka',
      enableServiceCharge: enableServiceCharge || false,
      serviceChargeRate: serviceChargeRate || 0.10,
      applyVATOnServiceCharge: applyVATOnServiceCharge || false,
      minimumTaxableAmount: minimumTaxableAmount || 0,
      receiptFooter,
      effectiveDate: effectiveDate || new Date(),
      notes,
      isActive: isActive !== undefined ? isActive : true,
      lastModifiedBy: req.user.id
    });

    // Clear VAT service cache
    vatService.clearCache();

    res.status(201).json({
      success: true,
      message: 'VAT settings created successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error creating VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating VAT settings',
      error: error.message
    });
  }
};

// @desc    Update VAT settings
// @route   PUT /api/vat-settings/:id
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const settings = await VATSettings.findByPk(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'VAT settings not found'
      });
    }

    const {
      isEnabled,
      defaultRate,
      calculationMethod,
      displayOnReceipt,
      displayLabel,
      roundingMethod,
      roundingPrecision,
      categoryRates,
      tieredRates,
      exemptCategories,
      exemptProducts,
      taxRegistrationNumber,
      complianceRegion,
      enableServiceCharge,
      serviceChargeRate,
      applyVATOnServiceCharge,
      minimumTaxableAmount,
      receiptFooter,
      effectiveDate,
      notes,
      isActive
    } = req.body;

    // Validate rate if provided
    if (defaultRate !== undefined && (defaultRate < 0 || defaultRate > 1)) {
      return res.status(400).json({
        success: false,
        message: 'VAT rate must be between 0 and 1 (0% to 100%)'
      });
    }

    // If this is set as active, deactivate all others
    if (isActive && !settings.isActive) {
      await VATSettings.update(
        { isActive: false },
        { where: { isActive: true } }
      );
    }

    // Update fields
    if (isEnabled !== undefined) settings.isEnabled = isEnabled;
    if (defaultRate !== undefined) settings.defaultRate = defaultRate;
    if (calculationMethod) settings.calculationMethod = calculationMethod;
    if (displayOnReceipt !== undefined) settings.displayOnReceipt = displayOnReceipt;
    if (displayLabel) settings.displayLabel = displayLabel;
    if (roundingMethod) settings.roundingMethod = roundingMethod;
    if (roundingPrecision !== undefined) settings.roundingPrecision = roundingPrecision;
    if (categoryRates) settings.categoryRates = categoryRates;
    if (tieredRates) settings.tieredRates = tieredRates;
    if (exemptCategories) settings.exemptCategories = exemptCategories;
    if (exemptProducts) settings.exemptProducts = exemptProducts;
    if (taxRegistrationNumber !== undefined) settings.taxRegistrationNumber = taxRegistrationNumber;
    if (complianceRegion) settings.complianceRegion = complianceRegion;
    if (enableServiceCharge !== undefined) settings.enableServiceCharge = enableServiceCharge;
    if (serviceChargeRate !== undefined) settings.serviceChargeRate = serviceChargeRate;
    if (applyVATOnServiceCharge !== undefined) settings.applyVATOnServiceCharge = applyVATOnServiceCharge;
    if (minimumTaxableAmount !== undefined) settings.minimumTaxableAmount = minimumTaxableAmount;
    if (receiptFooter !== undefined) settings.receiptFooter = receiptFooter;
    if (effectiveDate) settings.effectiveDate = effectiveDate;
    if (notes !== undefined) settings.notes = notes;
    if (isActive !== undefined) settings.isActive = isActive;
    settings.lastModifiedBy = req.user.id;

    await settings.save();

    // Clear VAT service cache
    vatService.clearCache();

    res.json({
      success: true,
      message: 'VAT settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating VAT settings',
      error: error.message
    });
  }
};

// @desc    Activate specific VAT settings
// @route   PUT /api/vat-settings/:id/activate
// @access  Private (Admin)
exports.activateSettings = async (req, res) => {
  try {
    const settings = await VATSettings.findByPk(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'VAT settings not found'
      });
    }

    // Deactivate all other settings
    await VATSettings.update(
      { isActive: false },
      { where: { isActive: true } }
    );

    // Activate this setting
    settings.isActive = true;
    settings.lastModifiedBy = req.user.id;
    await settings.save();

    // Clear VAT service cache
    vatService.clearCache();

    res.json({
      success: true,
      message: 'VAT settings activated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error activating VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating VAT settings',
      error: error.message
    });
  }
};

// @desc    Delete VAT settings
// @route   DELETE /api/vat-settings/:id
// @access  Private (Admin)
exports.deleteSettings = async (req, res) => {
  try {
    const settings = await VATSettings.findByPk(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'VAT settings not found'
      });
    }

    // Prevent deleting active settings
    if (settings.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active VAT settings. Please activate another configuration first.'
      });
    }

    await settings.destroy();

    res.json({
      success: true,
      message: 'VAT settings deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting VAT settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting VAT settings',
      error: error.message
    });
  }
};

// @desc    Test VAT calculation with current settings
// @route   POST /api/vat-settings/test-calculation
// @access  Private (Manager, Admin)
exports.testCalculation = async (req, res) => {
  try {
    const { amount, items } = req.body;

    if (!amount && !items) {
      return res.status(400).json({
        success: false,
        message: 'Either amount or items array is required'
      });
    }

    let result;
    if (items && Array.isArray(items)) {
      // Test with items
      result = await vatService.calculateBillVAT(items);
    } else {
      // Test with simple amount
      const settings = await vatService.getVATSettings();
      const vatAmount = await vatService.calculateVAT(amount);
      const total = await vatService.calculateTotalWithVAT(amount);

      result = {
        baseAmount: amount,
        vatAmount,
        totalAmount: total,
        vatRate: settings.defaultRate,
        vatPercentage: `${(settings.defaultRate * 100).toFixed(2)}%`,
        calculationMethod: settings.calculationMethod,
        displayLabel: settings.displayLabel
      };
    }

    res.json({
      success: true,
      message: 'VAT calculation test completed',
      data: result
    });
  } catch (error) {
    console.error('Error testing VAT calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing VAT calculation',
      error: error.message
    });
  }
};

// @desc    Get VAT calculation presets/templates
// @route   GET /api/vat-settings/presets
// @access  Private (Admin)
exports.getPresets = async (req, res) => {
  try {
    const presets = {
      sriLanka: {
        name: 'Sri Lanka Standard VAT',
        isEnabled: true,
        defaultRate: 0.15,
        calculationMethod: 'EXCLUSIVE',
        displayLabel: 'VAT',
        complianceRegion: 'Sri Lanka',
        enableServiceCharge: true,
        serviceChargeRate: 0.10,
        applyVATOnServiceCharge: true
      },
      india: {
        name: 'India GST',
        isEnabled: true,
        defaultRate: 0.18,
        calculationMethod: 'EXCLUSIVE',
        displayLabel: 'GST',
        complianceRegion: 'India',
        categoryRates: {
          'food': 0.05,
          'beverages': 0.12,
          'restaurant': 0.18
        }
      },
      uk: {
        name: 'UK VAT',
        isEnabled: true,
        defaultRate: 0.20,
        calculationMethod: 'EXCLUSIVE',
        displayLabel: 'VAT',
        complianceRegion: 'United Kingdom',
        exemptCategories: ['food-basic', 'children-clothing']
      },
      uae: {
        name: 'UAE VAT',
        isEnabled: true,
        defaultRate: 0.05,
        calculationMethod: 'EXCLUSIVE',
        displayLabel: 'VAT',
        complianceRegion: 'United Arab Emirates'
      },
      inclusive: {
        name: 'VAT Inclusive Pricing',
        isEnabled: true,
        defaultRate: 0.15,
        calculationMethod: 'INCLUSIVE',
        displayLabel: 'VAT',
        complianceRegion: 'Generic'
      },
      tiered: {
        name: 'Tiered VAT by Amount',
        isEnabled: true,
        defaultRate: 0.15,
        calculationMethod: 'TIERED',
        displayLabel: 'VAT',
        tieredRates: [
          { min: 0, max: 1000, rate: 0.08 },
          { min: 1000, max: 5000, rate: 0.12 },
          { min: 5000, max: null, rate: 0.15 }
        ]
      }
    };

    res.json({
      success: true,
      message: 'VAT configuration presets',
      data: presets
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching presets',
      error: error.message
    });
  }
};
