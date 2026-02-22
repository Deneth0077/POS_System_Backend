const ReceiptService = require('./receiptService');
const OfflineService = require('./offlineService');
const { getLanguageTranslations, formatCurrency, formatDate, formatTime } = require('../config/languages');

/**
 * Offline Receipt Service
 * Handles receipt generation for offline sales
 * Sub-issue 9.3: Offline receipt generation
 */
class OfflineReceiptService {
  /**
   * Generate receipt for offline sale
   * Sub-issue 9.3: Create receipts without server connection
   */
  static async generateOfflineReceipt(saleData, options = {}) {
    try {
      const {
        deviceId,
        cashierId,
        cashierName,
        receiptType = 'original',
        format = 'print',
        language = 'english',
        orderType = 'dine-in'
      } = options;

      // Generate receipt number for offline use
      const receiptNumber = this.generateOfflineReceiptNumber(deviceId);

      // Build receipt data structure
      const receiptData = {
        receiptNumber,
        saleId: null, // Will be set during sync
        receiptType,
        format,
        language,
        orderType,
        generatedBy: cashierId,
        generatedByName: cashierName,
        deliveryStatus: format === 'print' ? 'printed' : 'pending',
        
        // Store complete sale data for template generation
        saleData: {
          ...saleData,
          receiptNumber
        },

        // Generate template immediately for offline use
        template: null,
        
        // Offline metadata
        offlineGenerated: true,
        generatedOfflineAt: new Date(),
        deviceId
      };

      // Generate receipt template based on order type
      if (orderType === 'dine-in') {
        receiptData.template = ReceiptService.generateDineInTemplate(
          { sale: saleData, receiptNumber },
          language,
          receiptType
        );
      } else if (orderType === 'takeaway') {
        receiptData.template = ReceiptService.generateTakeawayTemplate(
          { sale: saleData, receiptNumber },
          language,
          receiptType
        );
      } else if (orderType === 'delivery') {
        receiptData.template = ReceiptService.generateDeliveryTemplate(
          { sale: saleData, receiptNumber },
          language,
          receiptType
        );
      }

      // Store receipt data including template
      receiptData.receiptData = {
        ...receiptData.saleData,
        template: receiptData.template
      };

      // Queue for sync
      const queueResult = await OfflineService.queueOfflineReceipt(
        receiptData,
        deviceId,
        cashierId,
        cashierName
      );

      return {
        success: true,
        receipt: receiptData,
        template: receiptData.template,
        queueId: queueResult.queueId,
        message: 'Receipt generated offline and queued for sync'
      };

    } catch (error) {
      console.error('Error generating offline receipt:', error);
      throw error;
    }
  }

  /**
   * Generate offline receipt number
   */
  static generateOfflineReceiptNumber(deviceId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const deviceShort = deviceId.substring(0, 4).toUpperCase();
    return `OFF-${deviceShort}-${timestamp}-${random}`;
  }

  /**
   * Convert receipt template to printable text
   * Sub-issue 9.3: Format for offline printing
   */
  static templateToText(template, language = 'english') {
    try {
      let text = '';
      const width = 40; // Standard thermal printer width

      // Helper function to center text
      const center = (str) => {
        const padding = Math.max(0, Math.floor((width - str.length) / 2));
        return ' '.repeat(padding) + str;
      };

      // Helper function to create line
      const line = (char = '=') => char.repeat(width);

      // Header
      text += line() + '\n';
      text += center(template.header.title) + '\n';
      text += center(template.header.subtitle || '') + '\n';
      text += line() + '\n';

      // Company Info
      text += center(template.companyInfo.name) + '\n';
      text += center(template.companyInfo.address) + '\n';
      text += center(template.companyInfo.phone) + '\n';
      if (template.companyInfo.vatNumber) {
        text += center(`VAT: ${template.companyInfo.vatNumber}`) + '\n';
      }
      text += line() + '\n';

      // Receipt Info
      text += `Receipt: ${template.receiptInfo.receiptNo}\n`;
      text += `Date: ${template.receiptInfo.date} ${template.receiptInfo.time}\n`;
      text += `Type: ${template.receiptInfo.orderType}\n`;
      if (template.receiptInfo.tableNo) {
        text += `Table: ${template.receiptInfo.tableNo}\n`;
      }
      text += `Cashier: ${template.receiptInfo.cashier}\n`;
      text += line('-') + '\n';

      // Items
      const t = getLanguageTranslations(language);
      text += `${t.item.padEnd(20)} ${t.qty.padStart(5)} ${t.price.padStart(10)}\n`;
      text += line('-') + '\n';

      for (const item of template.items) {
        const name = item.name.substring(0, 20).padEnd(20);
        const qty = item.quantity.toString().padStart(5);
        const price = formatCurrency(item.total, language).padStart(10);
        text += `${name} ${qty} ${price}\n`;
      }

      text += line('-') + '\n';

      // Calculations
      const subtotal = formatCurrency(template.calculations.subtotal, language).padStart(10);
      text += `${'Subtotal:'.padEnd(30)} ${subtotal}\n`;

      if (template.calculations.vat > 0) {
        const vat = formatCurrency(template.calculations.vat, language).padStart(10);
        text += `${`VAT (${template.calculations.vatRate}%):`.padEnd(30)} ${vat}\n`;
      }

      if (template.calculations.discount > 0) {
        const discount = formatCurrency(template.calculations.discount, language).padStart(10);
        text += `${'Discount:'.padEnd(30)} ${discount}\n`;
      }

      const total = formatCurrency(template.calculations.total, language).padStart(10);
      text += line('-') + '\n';
      text += `${'TOTAL:'.padEnd(30)} ${total}\n`;
      text += line('=') + '\n';

      // Payment Info
      if (template.paymentInfo) {
        text += `Payment: ${template.paymentInfo.method}\n`;
        if (template.paymentInfo.amountPaid) {
          const paid = formatCurrency(template.paymentInfo.amountPaid, language).padStart(10);
          text += `${'Amount Paid:'.padEnd(30)} ${paid}\n`;
        }
        if (template.paymentInfo.change > 0) {
          const change = formatCurrency(template.paymentInfo.change, language).padStart(10);
          text += `${'Change:'.padEnd(30)} ${change}\n`;
        }
        text += line('-') + '\n';
      }

      // Footer
      text += '\n' + center(template.footer.thankYou) + '\n';
      if (template.footer.visitAgain) {
        text += center(template.footer.visitAgain) + '\n';
      }
      text += '\n';
      text += center('[OFFLINE RECEIPT]') + '\n';
      text += center('Will sync when online') + '\n';
      text += line() + '\n';

      return text;

    } catch (error) {
      console.error('Error converting template to text:', error);
      throw error;
    }
  }

  /**
   * Get offline receipts by device
   */
  static async getOfflineReceipts(deviceId, limit = 50) {
    try {
      const { OfflineQueue } = require('../models');
      const { Op } = require('sequelize');

      return await OfflineQueue.findAll({
        where: {
          deviceId,
          operationType: 'receipt'
        },
        order: [['offlineTimestamp', 'DESC']],
        limit
      });

    } catch (error) {
      console.error('Error getting offline receipts:', error);
      throw error;
    }
  }

  /**
   * Get offline receipt by queue ID
   */
  static async getOfflineReceiptByQueueId(queueId) {
    try {
      const queueItem = await OfflineService.getQueueItem(queueId);

      if (!queueItem || queueItem.operationType !== 'receipt') {
        throw new Error('Receipt not found');
      }

      return {
        success: true,
        receipt: queueItem.transactionData,
        template: queueItem.transactionData.receiptData?.template,
        syncStatus: queueItem.syncStatus,
        queueItem
      };

    } catch (error) {
      console.error('Error getting offline receipt:', error);
      throw error;
    }
  }

  /**
   * Regenerate receipt template from queued data
   */
  static async regenerateTemplate(queueId, language = null) {
    try {
      const queueItem = await OfflineService.getQueueItem(queueId);

      if (!queueItem || queueItem.operationType !== 'receipt') {
        throw new Error('Receipt not found');
      }

      const receiptData = queueItem.transactionData;
      const lang = language || receiptData.language || 'english';
      const orderType = receiptData.orderType || 'dine-in';

      let template;
      if (orderType === 'dine-in') {
        template = ReceiptService.generateDineInTemplate(
          { sale: receiptData.saleData, receiptNumber: receiptData.receiptNumber },
          lang,
          receiptData.receiptType
        );
      } else if (orderType === 'takeaway') {
        template = ReceiptService.generateTakeawayTemplate(
          { sale: receiptData.saleData, receiptNumber: receiptData.receiptNumber },
          lang,
          receiptData.receiptType
        );
      } else if (orderType === 'delivery') {
        template = ReceiptService.generateDeliveryTemplate(
          { sale: receiptData.saleData, receiptNumber: receiptData.receiptNumber },
          lang,
          receiptData.receiptType
        );
      }

      return {
        success: true,
        template,
        text: this.templateToText(template, lang)
      };

    } catch (error) {
      console.error('Error regenerating template:', error);
      throw error;
    }
  }

  /**
   * Mark offline receipt as printed
   */
  static async markAsPrinted(queueId) {
    try {
      const { OfflineQueue } = require('../models');

      await OfflineQueue.update({
        metadata: require('../config/database').sequelize.literal(
          `JSON_SET(metadata, '$.printed', true, '$.printedAt', '${new Date().toISOString()}')`
        )
      }, {
        where: { queueId }
      });

      return {
        success: true,
        message: 'Receipt marked as printed'
      };

    } catch (error) {
      console.error('Error marking receipt as printed:', error);
      throw error;
    }
  }
}

module.exports = OfflineReceiptService;
