const { Receipt, Sale, User } = require('../models');
const { getLanguageTranslations, formatCurrency, formatDate, formatTime } = require('../config/languages');

class ReceiptService {
  /**
   * Generate receipt number
   */
  static async generateReceiptNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${timestamp}-${random}`;
  }

  /**
   * Generate receipt template for dine-in orders
   */
  static generateDineInTemplate(saleData, language = 'english', receiptType = 'original') {
    const t = getLanguageTranslations(language);
    const sale = saleData.sale || saleData;
    
    const template = {
      header: this.generateHeader(t, receiptType),
      companyInfo: this.generateCompanyInfo(t),
      receiptInfo: {
        receiptNo: sale.receiptNumber || 'N/A',
        saleNo: sale.saleNumber,
        date: formatDate(sale.saleDate || sale.createdAt, language),
        time: formatTime(sale.saleDate || sale.createdAt, language),
        orderType: t.dineIn,
        tableNo: sale.tableNumber || sale.tableId || 'N/A',
        cashier: sale.cashierName
      },
      items: this.generateItemList(sale.items, language),
      calculations: this.generateCalculations(sale, language, t),
      paymentInfo: this.generatePaymentInfo(sale, language, t),
      footer: this.generateFooter(t, receiptType),
      specialNotes: sale.notes || null
    };

    return template;
  }

  /**
   * Generate receipt template for takeaway orders
   */
  static generateTakeawayTemplate(saleData, language = 'english', receiptType = 'original') {
    const t = getLanguageTranslations(language);
    const sale = saleData.sale || saleData;
    
    const template = {
      header: this.generateHeader(t, receiptType),
      companyInfo: this.generateCompanyInfo(t),
      receiptInfo: {
        receiptNo: sale.receiptNumber || 'N/A',
        saleNo: sale.saleNumber,
        date: formatDate(sale.saleDate || sale.createdAt, language),
        time: formatTime(sale.saleDate || sale.createdAt, language),
        orderType: t.takeaway,
        cashier: sale.cashierName
      },
      items: this.generateItemList(sale.items, language),
      calculations: this.generateCalculations(sale, language, t),
      paymentInfo: this.generatePaymentInfo(sale, language, t),
      footer: this.generateFooter(t, receiptType),
      specialNotes: sale.notes || null
    };

    return template;
  }

  /**
   * Generate receipt template for delivery orders
   */
  static generateDeliveryTemplate(saleData, language = 'english', receiptType = 'original') {
    const t = getLanguageTranslations(language);
    const sale = saleData.sale || saleData;
    
    const template = {
      header: this.generateHeader(t, receiptType),
      companyInfo: this.generateCompanyInfo(t),
      receiptInfo: {
        receiptNo: sale.receiptNumber || 'N/A',
        saleNo: sale.saleNumber,
        date: formatDate(sale.saleDate || sale.createdAt, language),
        time: formatTime(sale.saleDate || sale.createdAt, language),
        orderType: t.delivery,
        cashier: sale.cashierName
      },
      items: this.generateItemList(sale.items, language),
      calculations: this.generateCalculations(sale, language, t),
      paymentInfo: this.generatePaymentInfo(sale, language, t),
      footer: this.generateFooter(t, receiptType),
      deliveryInfo: {
        // Placeholder for future delivery address integration
        address: sale.deliveryAddress || 'N/A'
      },
      specialNotes: sale.notes || null
    };

    return template;
  }

  /**
   * Generate receipt header
   */
  static generateHeader(t, receiptType) {
    let title = t.receiptTitle;
    
    if (receiptType === 'duplicate') {
      title = t.duplicateReceipt;
    } else if (receiptType === 'refund') {
      title = t.refundReceipt;
    } else if (receiptType === 'digital') {
      title = t.digitalReceipt;
    }

    return {
      title,
      type: receiptType
    };
  }

  /**
   * Generate company information
   */
  static generateCompanyInfo(t) {
    return {
      name: t.companyName,
      address: t.companyAddress,
      phone: t.companyPhone,
      email: t.companyEmail,
      vatNumber: t.vatNumber
    };
  }

  /**
   * Generate item list with formatting
   */
  static generateItemList(items, language) {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    return items.map(item => ({
      name: item.name || item.productName,
      quantity: item.quantity,
      unitPrice: formatCurrency(item.price || item.unitPrice, language),
      total: formatCurrency((item.quantity * (item.price || item.unitPrice)), language),
      rawTotal: item.quantity * (item.price || item.unitPrice)
    }));
  }

  /**
   * Generate calculation section
   */
  static generateCalculations(sale, language, t) {
    const calculations = {
      subtotal: {
        label: t.subtotal,
        amount: formatCurrency(sale.subtotal, language),
        rawAmount: parseFloat(sale.subtotal)
      },
      vat: {
        label: `${t.vat} (${(parseFloat(sale.vatRate || 0.15) * 100).toFixed(2)}%)`,
        amount: formatCurrency(sale.vatAmount, language),
        rawAmount: parseFloat(sale.vatAmount)
      },
      total: {
        label: t.totalAmount,
        amount: formatCurrency(sale.totalAmount, language),
        rawAmount: parseFloat(sale.totalAmount)
      }
    };

    return calculations;
  }

  /**
   * Generate payment information
   */
  static generatePaymentInfo(sale, language, t) {
    const paymentMethodMap = {
      'cash': t.cash,
      'card': t.card,
      'mobile': t.mobile,
      'other': t.other
    };

    const paymentInfo = {
      method: {
        label: t.paymentMethod,
        value: paymentMethodMap[sale.paymentMethod] || sale.paymentMethod
      },
      amountPaid: {
        label: t.amountPaid,
        amount: formatCurrency(sale.amountPaid, language),
        rawAmount: parseFloat(sale.amountPaid)
      }
    };

    // Add change for cash payments
    if (sale.paymentMethod === 'cash' && sale.changeGiven > 0) {
      paymentInfo.change = {
        label: t.change,
        amount: formatCurrency(sale.changeGiven, language),
        rawAmount: parseFloat(sale.changeGiven)
      };
    }

    // Add split bill info if applicable
    if (sale.isSplit) {
      paymentInfo.splitBill = {
        label: t.splitBill,
        value: t.splitBill
      };
    }

    return paymentInfo;
  }

  /**
   * Generate footer section
   */
  static generateFooter(t, receiptType) {
    return {
      thankYou: t.thankYou,
      poweredBy: t.poweredBy,
      terms: t.termsAndConditions,
      refundPolicy: t.noRefund,
      copy: receiptType === 'original' ? t.customerCopy : t.merchantCopy
    };
  }

  /**
   * Generate complete receipt based on order type
   */
  static generateReceipt(saleData, language = 'english', receiptType = 'original') {
    const sale = saleData.sale || saleData;
    const orderType = sale.orderType || 'takeaway';

    switch (orderType) {
      case 'dine-in':
        return this.generateDineInTemplate(sale, language, receiptType);
      case 'takeaway':
        return this.generateTakeawayTemplate(sale, language, receiptType);
      case 'delivery':
        return this.generateDeliveryTemplate(sale, language, receiptType);
      default:
        return this.generateTakeawayTemplate(sale, language, receiptType);
    }
  }

  /**
   * Convert receipt template to plain text format
   */
  static templateToPlainText(template) {
    let text = '';
    
    // Header
    text += '='.repeat(48) + '\n';
    text += template.companyInfo.name.toUpperCase().padStart(32) + '\n';
    text += template.companyInfo.address.padStart(30) + '\n';
    text += template.companyInfo.phone + '\n';
    text += template.companyInfo.email + '\n';
    text += template.companyInfo.vatNumber + '\n';
    text += '='.repeat(48) + '\n';
    text += template.header.title.toUpperCase().padStart(30) + '\n';
    text += '='.repeat(48) + '\n';
    
    // Receipt Info
    const info = template.receiptInfo;
    text += `${info.date} ${info.time}\n`;
    text += `Receipt No: ${info.receiptNo}\n`;
    text += `Sale No: ${info.saleNo}\n`;
    text += `Order Type: ${info.orderType}\n`;
    if (info.tableNo) {
      text += `Table No: ${info.tableNo}\n`;
    }
    text += `Cashier: ${info.cashier}\n`;
    text += '-'.repeat(48) + '\n';
    
    // Items
    text += 'Item'.padEnd(25) + 'Qty'.padEnd(8) + 'Price'.padEnd(15) + '\n';
    text += '-'.repeat(48) + '\n';
    
    template.items.forEach(item => {
      text += item.name.substring(0, 25).padEnd(25);
      text += item.quantity.toString().padEnd(8);
      text += item.total.padEnd(15) + '\n';
    });
    
    text += '-'.repeat(48) + '\n';
    
    // Calculations
    text += template.calculations.subtotal.label.padEnd(33);
    text += template.calculations.subtotal.amount.padStart(15) + '\n';
    
    text += template.calculations.vat.label.padEnd(33);
    text += template.calculations.vat.amount.padStart(15) + '\n';
    
    text += '='.repeat(48) + '\n';
    text += template.calculations.total.label.toUpperCase().padEnd(33);
    text += template.calculations.total.amount.padStart(15) + '\n';
    text += '='.repeat(48) + '\n';
    
    // Payment Info
    text += `\n${template.paymentInfo.method.label}: ${template.paymentInfo.method.value}\n`;
    text += `${template.paymentInfo.amountPaid.label}: ${template.paymentInfo.amountPaid.amount}\n`;
    
    if (template.paymentInfo.change) {
      text += `${template.paymentInfo.change.label}: ${template.paymentInfo.change.amount}\n`;
    }
    
    // Special Notes
    if (template.specialNotes) {
      text += '\n' + '-'.repeat(48) + '\n';
      text += `Notes: ${template.specialNotes}\n`;
    }
    
    // Footer
    text += '\n' + '='.repeat(48) + '\n';
    text += template.footer.thankYou.toUpperCase().padStart(30) + '\n';
    text += template.footer.poweredBy.padStart(32) + '\n';
    text += '\n' + template.footer.terms + '\n';
    text += template.footer.refundPolicy + '\n';
    text += '='.repeat(48) + '\n';
    
    return text;
  }

  /**
   * Convert receipt template to HTML format
   */
  static templateToHTML(template) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Courier New', monospace;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    .receipt {
      border: 2px solid #000;
      padding: 15px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .receipt-title {
      font-size: 16px;
      font-weight: bold;
      margin: 10px 0;
    }
    .receipt-info {
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .items-table th {
      border-bottom: 2px solid #000;
      text-align: left;
      padding: 5px 0;
    }
    .items-table td {
      padding: 5px 0;
      border-bottom: 1px dashed #ccc;
    }
    .calculations {
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 10px;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .total-row {
      font-weight: bold;
      font-size: 16px;
      border-top: 2px solid #000;
      padding-top: 5px;
      margin-top: 5px;
    }
    .payment-info {
      border-top: 1px dashed #000;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 15px;
      font-size: 12px;
    }
    .notes {
      border: 1px dashed #000;
      padding: 10px;
      margin: 10px 0;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="company-name">${template.companyInfo.name}</div>
      <div>${template.companyInfo.address}</div>
      <div>${template.companyInfo.phone}</div>
      <div>${template.companyInfo.email}</div>
      <div>${template.companyInfo.vatNumber}</div>
      <div class="receipt-title">${template.header.title}</div>
    </div>
    
    <div class="receipt-info">
      <div>${template.receiptInfo.date} ${template.receiptInfo.time}</div>
      <div>Receipt No: ${template.receiptInfo.receiptNo}</div>
      <div>Sale No: ${template.receiptInfo.saleNo}</div>
      <div>Order Type: ${template.receiptInfo.orderType}</div>
      ${template.receiptInfo.tableNo ? `<div>Table No: ${template.receiptInfo.tableNo}</div>` : ''}
      <div>Cashier: ${template.receiptInfo.cashier}</div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${template.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td style="text-align: right;">${item.total}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="calculations">
      <div class="calc-row">
        <span>${template.calculations.subtotal.label}</span>
        <span>${template.calculations.subtotal.amount}</span>
      </div>
      <div class="calc-row">
        <span>${template.calculations.vat.label}</span>
        <span>${template.calculations.vat.amount}</span>
      </div>
      <div class="calc-row total-row">
        <span>${template.calculations.total.label}</span>
        <span>${template.calculations.total.amount}</span>
      </div>
    </div>
    
    <div class="payment-info">
      <div class="calc-row">
        <span>${template.paymentInfo.method.label}</span>
        <span>${template.paymentInfo.method.value}</span>
      </div>
      <div class="calc-row">
        <span>${template.paymentInfo.amountPaid.label}</span>
        <span>${template.paymentInfo.amountPaid.amount}</span>
      </div>
      ${template.paymentInfo.change ? `
        <div class="calc-row">
          <span>${template.paymentInfo.change.label}</span>
          <span>${template.paymentInfo.change.amount}</span>
        </div>
      ` : ''}
    </div>
    
    ${template.specialNotes ? `
      <div class="notes">
        <strong>Notes:</strong> ${template.specialNotes}
      </div>
    ` : ''}
    
    <div class="footer">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
        ${template.footer.thankYou}
      </div>
      <div>${template.footer.poweredBy}</div>
      <div style="margin-top: 10px; font-size: 10px;">
        ${template.footer.terms}<br>
        ${template.footer.refundPolicy}
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create and save receipt record
   */
  static async createReceipt(saleId, userId, userName, options = {}) {
    const {
      receiptType = 'original',
      format = 'print',
      language = 'english',
      deliveryMethod = null,
      ipAddress = null,
      userAgent = null,
      metadata = {}
    } = options;

    // Fetch sale with all related data
    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber();

    // Generate receipt template
    const template = this.generateReceipt(sale, language, receiptType);

    // Create receipt record
    const receipt = await Receipt.create({
      receiptNumber,
      saleId,
      receiptType,
      format,
      language,
      orderType: sale.orderType,
      templateVersion: '1.0',
      receiptData: {
        template,
        sale: sale.toJSON()
      },
      deliveryMethod,
      deliveryStatus: format === 'print' ? 'pending' : 'pending',
      generatedBy: userId,
      generatedByName: userName,
      ipAddress,
      userAgent,
      metadata
    });

    return {
      receipt,
      template
    };
  }

  /**
   * Generate duplicate receipt
   */
  static async generateDuplicate(receiptId, userId, userName) {
    const originalReceipt = await Receipt.findByPk(receiptId, {
      include: [{ model: Sale, as: 'sale' }]
    });

    if (!originalReceipt) {
      throw new Error('Original receipt not found');
    }

    const duplicateReceipt = await this.createReceipt(
      originalReceipt.saleId,
      userId,
      userName,
      {
        receiptType: 'duplicate',
        format: originalReceipt.format,
        language: originalReceipt.language
      }
    );

    return duplicateReceipt;
  }

  /**
   * Void a receipt
   */
  static async voidReceipt(receiptId, userId, reason) {
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (receipt.isVoided) {
      throw new Error('Receipt is already voided');
    }

    await receipt.update({
      isVoided: true,
      voidedAt: new Date(),
      voidedBy: userId,
      voidReason: reason
    });

    return receipt;
  }

  /**
   * Get receipt by ID
   */
  static async getReceiptById(receiptId) {
    return await Receipt.findByPk(receiptId, {
      include: [
        { model: Sale, as: 'sale' },
        { model: User, as: 'generator', attributes: ['id', 'username', 'fullName'] },
        { model: User, as: 'voider', attributes: ['id', 'username', 'fullName'] }
      ]
    });
  }

  /**
   * Get all receipts for a sale
   */
  static async getReceiptsBySale(saleId) {
    return await Receipt.findAll({
      where: { saleId },
      include: [
        { model: User, as: 'generator', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = ReceiptService;
