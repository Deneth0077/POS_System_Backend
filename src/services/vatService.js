const { VAT_RATE } = require('../config/vat');
const { Product, MenuItem } = require('../models');
const VATSettings = require('../models/VATSettings');

/**
 * Enhanced VAT Calculation Service
 * Handles all VAT-related calculations for the POS system
 */
class VATService {
  constructor() {
    this.vatRate = VAT_RATE;
    this.cachedSettings = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get active VAT settings from database or cache
   */
  async getVATSettings() {
    try {
      if (this.cachedSettings && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        return this.cachedSettings;
      }

      const settings = await VATSettings.findOne({
        where: { isActive: true },
        order: [['effectiveDate', 'DESC']]
      });

      if (settings) {
        this.cachedSettings = settings;
        this.cacheExpiry = Date.now() + this.cacheTimeout;
        return settings;
      }

      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error fetching VAT settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default VAT settings
   */
  getDefaultSettings() {
    return {
      isEnabled: true,
      defaultRate: this.vatRate,
      calculationMethod: 'EXCLUSIVE',
      displayOnReceipt: true,
      displayLabel: 'VAT',
      roundingMethod: 'NEAREST',
      roundingPrecision: 2,
      categoryRates: {},
      tieredRates: [],
      exemptCategories: [],
      exemptProducts: [],
      enableServiceCharge: false,
      serviceChargeRate: 0.10,
      applyVATOnServiceCharge: false,
      minimumTaxableAmount: 0
    };
  }

  /**
   * Round amount based on settings
   */
  roundAmount(amount, method = 'NEAREST', precision = 2) {
    const multiplier = Math.pow(10, precision);

    switch (method) {
      case 'UP':
        return Math.ceil(amount * multiplier) / multiplier;
      case 'DOWN':
        return Math.floor(amount * multiplier) / multiplier;
      case 'NONE':
        return amount;
      case 'NEAREST':
      default:
        return Math.round(amount * multiplier) / multiplier;
    }
  }

  /**
   * Get applicable VAT rate for a product based on settings
   */
  async getProductVATRate(product, settings = null) {
    if (!settings) {
      settings = await this.getVATSettings();
    }

    if (!settings.isEnabled) {
      return 0;
    }

    if (!product.taxable) {
      return 0;
    }

    if (settings.exemptCategories && settings.exemptCategories.includes(product.category)) {
      return 0;
    }

    if (settings.exemptProducts && settings.exemptProducts.includes(product.id)) {
      return 0;
    }

    if (settings.calculationMethod === 'SPLIT_RATE' && settings.categoryRates) {
      const categoryRate = settings.categoryRates[product.category];
      if (categoryRate !== undefined) {
        return parseFloat(categoryRate);
      }
    }

    return parseFloat(settings.defaultRate);
  }

  /**
   * Get VAT rate based on amount for TIERED method
   */
  getTieredVATRate(amount, settings) {
    if (!settings.tieredRates || settings.tieredRates.length === 0) {
      return settings.defaultRate;
    }

    for (const tier of settings.tieredRates) {
      const min = tier.min || 0;
      const max = tier.max || Infinity;

      if (amount >= min && amount < max) {
        return parseFloat(tier.rate);
      }
    }

    return settings.defaultRate;
  }

  /**
   * Calculate VAT amount from a base amount
   */
  async calculateVAT(amount, customRate = null) {
    const settings = await this.getVATSettings();
    let rate = customRate !== null ? customRate : settings.defaultRate;

    if (customRate === null && settings.calculationMethod === 'TIERED') {
      rate = this.getTieredVATRate(amount, settings);
    }

    const vatAmount = amount * rate;
    return this.roundAmount(vatAmount, settings.roundingMethod, settings.roundingPrecision);
  }

  /**
   * Calculate total amount including VAT
   */
  async calculateTotalWithVAT(amount, customRate = null) {
    const vatAmount = await this.calculateVAT(amount, customRate);
    const settings = await this.getVATSettings();
    const total = amount + vatAmount;
    return this.roundAmount(total, settings.roundingMethod, settings.roundingPrecision);
  }

  /**
   * Extract VAT amount from a total that already includes VAT
   */
  async extractVATFromTotal(totalWithVAT, customRate = null) {
    const settings = await this.getVATSettings();
    const rate = customRate !== null ? customRate : settings.defaultRate;
    const vatAmount = totalWithVAT * (rate / (1 + rate));
    return this.roundAmount(vatAmount, settings.roundingMethod, settings.roundingPrecision);
  }

  /**
   * Calculate base amount from total that includes VAT
   */
  async calculateBaseFromTotal(totalWithVAT, customRate = null) {
    const settings = await this.getVATSettings();
    const rate = customRate !== null ? customRate : settings.defaultRate;
    const baseAmount = totalWithVAT / (1 + rate);
    return this.roundAmount(baseAmount, settings.roundingMethod, settings.roundingPrecision);
  }

  /**
   * Calculate service charge if enabled
   */
  async calculateServiceCharge(subtotal) {
    const settings = await this.getVATSettings();

    if (!settings.enableServiceCharge) {
      return {
        amount: 0,
        rate: 0,
        enabled: false
      };
    }

    const serviceChargeAmount = subtotal * settings.serviceChargeRate;
    const roundedAmount = this.roundAmount(serviceChargeAmount, settings.roundingMethod, settings.roundingPrecision);

    return {
      amount: roundedAmount,
      rate: settings.serviceChargeRate,
      enabled: true
    };
  }

  /**
   * Calculate VAT for a single item
   */
  async calculateItemVAT(item, product = null, settings = null) {
    try {
      if (!settings) {
        settings = await this.getVATSettings();
      }

      let itemType = item.itemType || 'product';

      // Fetch product or menu item if not provided
      if (!product && item.product) {
        if (itemType === 'product') {
          product = await Product.findByPk(item.product);
          if (!product) {
            product = await MenuItem.findByPk(item.product);
            if (product) itemType = 'menu-item';
          }
        } else {
          product = await MenuItem.findByPk(item.product);
          if (!product) {
            product = await Product.findByPk(item.product);
            if (product) itemType = 'product';
          }
        }

        if (!product) {
          throw new Error(`Item with ID ${item.product} not found in Products or Menu Items`);
        }
      } else if (product) {
        itemType = product.sku ? 'product' : 'menu-item';
      }

      let itemSubtotal = item.quantity * item.unitPrice;
      itemSubtotal = this.roundAmount(itemSubtotal, settings.roundingMethod, settings.roundingPrecision);

      const vatRate = await this.getProductVATRate(product, settings);
      const isTaxable = vatRate > 0;

      let itemVAT = 0;
      let itemTotal = itemSubtotal;

      if (isTaxable) {
        if (settings.calculationMethod === 'INCLUSIVE') {
          itemTotal = itemSubtotal;
          itemSubtotal = itemSubtotal / (1 + vatRate);
          itemVAT = itemTotal - itemSubtotal;
        } else {
          itemVAT = itemSubtotal * vatRate;
          itemTotal = itemSubtotal + itemVAT;
        }

        itemVAT = this.roundAmount(itemVAT, settings.roundingMethod, settings.roundingPrecision);
        itemTotal = this.roundAmount(itemTotal, settings.roundingMethod, settings.roundingPrecision);
      }

      return {
        product: item.product,
        productName: product ? product.name : item.productName,
        category: product ? product.category : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        vatAmount: itemVAT,
        vatRate: vatRate,
        totalWithVAT: itemTotal,
        taxable: isTaxable,
        batchNumber: item.batchNumber || null,
        kitchenStationId: product ? product.kitchenStationId : (item.kitchenStationId || null),
        itemType: itemType,
        costPrice: product ? product.costPrice : 0
      };
    } catch (error) {
      throw new Error(`Error calculating item VAT: ${error.message}`);
    }
  }

  /**
   * Calculate VAT for multiple items (entire bill)
   */
  async calculateBillVAT(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items must be a non-empty array');
      }

      const settings = await this.getVATSettings();
      const processedItems = [];
      let billSubtotal = 0;
      let billVATAmount = 0;
      let taxableSubtotal = 0;
      let nonTaxableSubtotal = 0;
      const categoryBreakdown = {};

      for (const item of items) {
        const itemWithVAT = await this.calculateItemVAT(item, null, settings);
        processedItems.push(itemWithVAT);

        billSubtotal += itemWithVAT.subtotal;
        billVATAmount += itemWithVAT.vatAmount;

        if (itemWithVAT.taxable) {
          taxableSubtotal += itemWithVAT.subtotal;

          const category = itemWithVAT.category || 'uncategorized';
          if (!categoryBreakdown[category]) {
            categoryBreakdown[category] = {
              subtotal: 0,
              vatAmount: 0,
              vatRate: itemWithVAT.vatRate
            };
          }
          categoryBreakdown[category].subtotal += itemWithVAT.subtotal;
          categoryBreakdown[category].vatAmount += itemWithVAT.vatAmount;
        } else {
          nonTaxableSubtotal += itemWithVAT.subtotal;
        }
      }

      billSubtotal = this.roundAmount(billSubtotal, settings.roundingMethod, settings.roundingPrecision);
      taxableSubtotal = this.roundAmount(taxableSubtotal, settings.roundingMethod, settings.roundingPrecision);
      nonTaxableSubtotal = this.roundAmount(nonTaxableSubtotal, settings.roundingMethod, settings.roundingPrecision);
      billVATAmount = this.roundAmount(billVATAmount, settings.roundingMethod, settings.roundingPrecision);

      const serviceCharge = await this.calculateServiceCharge(billSubtotal);
      let serviceChargeVAT = 0;

      if (serviceCharge.enabled && settings.applyVATOnServiceCharge) {
        serviceChargeVAT = await this.calculateVAT(serviceCharge.amount, settings.defaultRate);
      }

      let billTotal = billSubtotal + billVATAmount + serviceCharge.amount + serviceChargeVAT;
      billTotal = this.roundAmount(billTotal, settings.roundingMethod, settings.roundingPrecision);

      if (billSubtotal < settings.minimumTaxableAmount) {
        billVATAmount = 0;
        serviceChargeVAT = 0;
        billTotal = billSubtotal + serviceCharge.amount;
      }

      return {
        items: processedItems,
        subtotal: billSubtotal,
        taxableSubtotal,
        nonTaxableSubtotal,
        vatAmount: billVATAmount,
        vatRate: settings.defaultRate,
        serviceCharge: serviceCharge.amount,
        serviceChargeVAT,
        totalAmount: billTotal,
        totalItems: items.length,
        calculationMethod: settings.calculationMethod,
        categoryBreakdown,
        displayLabel: settings.displayLabel
      };
    } catch (error) {
      throw new Error(`Error calculating bill VAT: ${error.message}`);
    }
  }

  /**
   * Calculate VAT breakdown for reporting purposes
   */
  async getVATBreakdown(subtotal, totalAmount) {
    const calculatedVAT = await this.calculateVAT(subtotal);
    const expectedTotal = await this.calculateTotalWithVAT(subtotal);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      vatRate: this.vatRate,
      vatPercentage: `${(this.vatRate * 100).toFixed(2)}%`,
      vatAmount: parseFloat(calculatedVAT.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      expectedTotal: parseFloat(expectedTotal.toFixed(2)),
      difference: parseFloat((totalAmount - expectedTotal).toFixed(2))
    };
  }

  /**
   * Validate VAT calculations for a sale
   */
  async validateVATCalculation(saleData) {
    const { subtotal, vatAmount, totalAmount, vatRate } = saleData;

    const expectedVAT = await this.calculateVAT(subtotal, vatRate);
    const expectedTotal = parseFloat((subtotal + expectedVAT).toFixed(2));

    const vatDifference = Math.abs(vatAmount - expectedVAT);
    const totalDifference = Math.abs(totalAmount - expectedTotal);

    const isValid = vatDifference <= 0.01 && totalDifference <= 0.01;

    return {
      isValid,
      expectedVAT: parseFloat(expectedVAT.toFixed(2)),
      actualVAT: parseFloat(vatAmount.toFixed(2)),
      vatDifference: parseFloat(vatDifference.toFixed(2)),
      expectedTotal: parseFloat(expectedTotal.toFixed(2)),
      actualTotal: parseFloat(totalAmount.toFixed(2)),
      totalDifference: parseFloat(totalDifference.toFixed(2)),
      message: isValid ? 'VAT calculation is valid' : 'VAT calculation has discrepancies'
    };
  }

  /**
   * Calculate VAT for split bills
   */
  async calculateSplitVAT(totalAmount, splitAmount, numberOfSplits = 1) {
    const splitSubtotal = await this.calculateBaseFromTotal(splitAmount);
    const splitVAT = await this.extractVATFromTotal(splitAmount);

    return {
      splitNumber: numberOfSplits,
      splitSubtotal: parseFloat(splitSubtotal.toFixed(2)),
      splitVAT: parseFloat(splitVAT.toFixed(2)),
      splitTotal: parseFloat(splitAmount.toFixed(2)),
      vatRate: this.vatRate
    };
  }

  /**
   * Get current VAT rate
   */
  async getVATRate() {
    const settings = await this.getVATSettings();
    return settings.defaultRate;
  }

  /**
   * Get VAT rate as percentage string
   */
  async getVATRatePercentage() {
    const rate = await this.getVATRate();
    return `${(rate * 100).toFixed(2)}%`;
  }
}

module.exports = new VATService();
