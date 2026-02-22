const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VAT Settings Model
 * Stores customizable VAT configuration for the restaurant
 * Supports multiple calculation methods and rules
 */
const VATSettings = sequelize.define('VATSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Basic VAT Configuration
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Enable/disable VAT calculations globally'
  },
  defaultRate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0.15,
    validate: {
      min: 0,
      max: 1
    },
    comment: 'Default VAT rate (e.g., 0.15 for 15%)'
  },
  
  // Calculation Method
  calculationMethod: {
    type: DataTypes.ENUM(
      'INCLUSIVE',      // VAT included in price (price = base + vat)
      'EXCLUSIVE',      // VAT added to price (total = price + vat)
      'COMPOUND',       // VAT on subtotal after other taxes
      'SPLIT_RATE',     // Different rates for different categories
      'TIERED'          // Different rates based on amount ranges
    ),
    defaultValue: 'EXCLUSIVE',
    comment: 'Method used to calculate VAT'
  },

  // Display Settings
  displayOnReceipt: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Show VAT breakdown on receipts'
  },
  displayLabel: {
    type: DataTypes.STRING(50),
    defaultValue: 'VAT',
    comment: 'Label to display (VAT, GST, Tax, etc.)'
  },
  
  // Rounding Configuration
  roundingMethod: {
    type: DataTypes.ENUM('NEAREST', 'UP', 'DOWN', 'NONE'),
    defaultValue: 'NEAREST',
    comment: 'How to round VAT amounts'
  },
  roundingPrecision: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    validate: {
      min: 0,
      max: 4
    },
    comment: 'Decimal places for rounding'
  },

  // Category-Specific Rates (for SPLIT_RATE method)
  categoryRates: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'JSON object mapping categories to VAT rates. Example: {"food": 0.15, "beverages": 0.10, "alcohol": 0.20}'
  },

  // Tiered Rates (for TIERED method)
  tieredRates: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of tier objects with min, max, and rate. Example: [{"min": 0, "max": 1000, "rate": 0.10}, {"min": 1000, "max": null, "rate": 0.15}]'
  },

  // Tax Exemptions
  exemptCategories: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of product categories exempt from VAT. Example: ["medicine", "education"]'
  },
  exemptProducts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of specific product IDs exempt from VAT'
  },

  // Government Compliance
  taxRegistrationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Government VAT/Tax registration number'
  },
  complianceRegion: {
    type: DataTypes.STRING(100),
    defaultValue: 'Sri Lanka',
    comment: 'Country/region for tax compliance'
  },
  
  // Additional Charges
  enableServiceCharge: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Enable service charge calculation'
  },
  serviceChargeRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.10,
    validate: {
      min: 0,
      max: 1
    },
    comment: 'Service charge rate if enabled'
  },
  applyVATOnServiceCharge: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether to apply VAT on service charge amount'
  },

  // Minimum Transaction Amount
  minimumTaxableAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Minimum transaction amount for VAT to apply'
  },

  // Receipt Information
  receiptFooter: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Custom footer text for VAT information on receipts'
  },

  // Audit Fields
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID who last modified settings'
  },
  effectiveDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Date when these settings become effective'
  },
  
  // Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Administrative notes about VAT settings'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this configuration is currently active'
  }
}, {
  tableName: 'vat_settings',
  timestamps: true,
  indexes: [
    { fields: ['isActive'] },
    { fields: ['effectiveDate'] },
    { fields: ['calculationMethod'] }
  ]
});

module.exports = VATSettings;
