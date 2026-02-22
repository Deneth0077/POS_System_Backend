const { Op } = require('sequelize');
const { Sale, Product, User } = require('../models');
const vatService = require('./vatService');

/**
 * VAT Report Service
 * Generates compliance reports for VAT (Value Added Tax)
 * Supports Sri Lanka tax authority requirements
 */
class VATReportService {
  /**
   * Generate comprehensive VAT report for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options (groupBy, includeDetails)
   * @returns {Promise<Object>} VAT report
   */
  async generateVATReport(startDate, endDate, options = {}) {
    try {
      const { groupBy = 'day', includeDetails = false } = options;

      // Fetch all sales in date range
      const sales = await Sale.findAll({
        where: {
          saleDate: {
            [Op.between]: [startDate, endDate]
          },
          status: {
            [Op.in]: ['completed', 'refunded']
          }
        },
        include: [
          {
            model: User,
            as: 'cashier',
            attributes: ['id', 'fullName', 'username']
          }
        ],
        order: [['saleDate', 'ASC']]
      });

      // Calculate totals
      const summary = this.calculateVATSummary(sales);

      // Group sales by period
      const groupedData = this.groupSalesByPeriod(sales, groupBy);

      // Calculate VAT liability
      const vatLiability = this.calculateVATLiability(sales);

      // Get product-wise VAT breakdown
      const productBreakdown = await this.getProductVATBreakdown(sales);

      const report = {
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        summary,
        vatLiability,
        groupedData,
        productBreakdown,
        complianceInfo: this.getComplianceInfo(),
        generatedAt: new Date().toISOString()
      };

      if (includeDetails) {
        report.salesDetails = sales.map(sale => this.formatSaleForReport(sale));
      }

      return report;
    } catch (error) {
      throw new Error(`Error generating VAT report: ${error.message}`);
    }
  }

  /**
   * Calculate VAT summary from sales
   * @param {Array} sales - Array of sale records
   * @returns {Object} Summary statistics
   */
  calculateVATSummary(sales) {
    let totalSales = 0;
    let totalSubtotal = 0;
    let totalVAT = 0;
    let totalRefunded = 0;
    let totalRefundedVAT = 0;
    let taxableSales = 0;
    let nonTaxableSales = 0;

    sales.forEach(sale => {
      const subtotal = parseFloat(sale.subtotal);
      const vat = parseFloat(sale.vatAmount);
      const total = parseFloat(sale.totalAmount);

      if (sale.status === 'refunded') {
        totalRefunded += total;
        totalRefundedVAT += vat;
      } else {
        totalSales += total;
        totalSubtotal += subtotal;
        totalVAT += vat;

        // Calculate taxable vs non-taxable
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            if (item.taxable !== false) {
              taxableSales += parseFloat(item.subtotal || 0);
            } else {
              nonTaxableSales += parseFloat(item.subtotal || 0);
            }
          });
        }
      }
    });

    // Net amounts (after refunds)
    const netSubtotal = totalSubtotal - (totalRefunded - totalRefundedVAT);
    const netVAT = totalVAT - totalRefundedVAT;
    const netTotal = totalSales - totalRefunded;

    return {
      totalTransactions: sales.length,
      completedTransactions: sales.filter(s => s.status === 'completed').length,
      refundedTransactions: sales.filter(s => s.status === 'refunded').length,
      
      // Gross amounts
      grossSubtotal: parseFloat(totalSubtotal.toFixed(2)),
      grossVATAmount: parseFloat(totalVAT.toFixed(2)),
      grossTotal: parseFloat(totalSales.toFixed(2)),
      
      // Refunds
      refundedAmount: parseFloat(totalRefunded.toFixed(2)),
      refundedVAT: parseFloat(totalRefundedVAT.toFixed(2)),
      
      // Net amounts (for tax liability)
      netSubtotal: parseFloat(netSubtotal.toFixed(2)),
      netVATAmount: parseFloat(netVAT.toFixed(2)),
      netTotal: parseFloat(netTotal.toFixed(2)),
      
      // Taxable breakdown
      taxableSales: parseFloat(taxableSales.toFixed(2)),
      nonTaxableSales: parseFloat(nonTaxableSales.toFixed(2)),
      taxablePercentage: totalSubtotal > 0 
        ? parseFloat(((taxableSales / totalSubtotal) * 100).toFixed(2))
        : 0,
      
      // Average transaction
      averageTransaction: sales.length > 0 
        ? parseFloat((totalSales / sales.length).toFixed(2))
        : 0,
      averageVAT: sales.length > 0 
        ? parseFloat((totalVAT / sales.length).toFixed(2))
        : 0
    };
  }

  /**
   * Group sales by time period
   * @param {Array} sales - Array of sales
   * @param {String} groupBy - 'day', 'week', 'month'
   * @returns {Array} Grouped sales data
   */
  groupSalesByPeriod(sales, groupBy = 'day') {
    const groups = new Map();

    sales.forEach(sale => {
      const date = new Date(sale.saleDate);
      let key;

      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'day':
        default:
          key = date.toISOString().split('T')[0];
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          sales: [],
          subtotal: 0,
          vatAmount: 0,
          totalAmount: 0,
          transactionCount: 0
        });
      }

      const group = groups.get(key);
      group.sales.push(sale);
      group.subtotal += parseFloat(sale.subtotal);
      group.vatAmount += parseFloat(sale.vatAmount);
      group.totalAmount += parseFloat(sale.totalAmount);
      group.transactionCount++;
    });

    // Convert to array and format
    return Array.from(groups.values())
      .map(group => ({
        period: group.period,
        transactionCount: group.transactionCount,
        subtotal: parseFloat(group.subtotal.toFixed(2)),
        vatAmount: parseFloat(group.vatAmount.toFixed(2)),
        totalAmount: parseFloat(group.totalAmount.toFixed(2)),
        averageTransaction: parseFloat((group.totalAmount / group.transactionCount).toFixed(2))
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate VAT liability (amount owed to tax authority)
   * @param {Array} sales - Array of sales
   * @returns {Object} VAT liability details
   */
  calculateVATLiability(sales) {
    const summary = this.calculateVATSummary(sales);
    const vatRate = vatService.getVATRate();

    return {
      vatRate: vatRate,
      vatRatePercentage: vatService.getVATRatePercentage(),
      
      // Output VAT (collected from customers)
      outputVAT: summary.grossVATAmount,
      
      // Refunded VAT (to be deducted)
      refundedVAT: summary.refundedVAT,
      
      // Net VAT payable
      netVATPayable: summary.netVATAmount,
      
      // Tax period info
      taxPeriodSales: summary.netTotal,
      taxPeriodSubtotal: summary.netSubtotal,
      
      // Compliance
      complianceStatus: this.checkCompliance(summary),
      discrepancies: this.findDiscrepancies(sales)
    };
  }

  /**
   * Get product-wise VAT breakdown
   * @param {Array} sales - Array of sales
   * @returns {Promise<Array>} Product VAT breakdown
   */
  async getProductVATBreakdown(sales) {
    const productMap = new Map();

    // Aggregate by product
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const productId = item.product;
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              productId,
              productName: item.productName,
              quantitySold: 0,
              subtotal: 0,
              vatAmount: 0,
              totalAmount: 0,
              transactionCount: 0
            });
          }

          const product = productMap.get(productId);
          product.quantitySold += item.quantity;
          product.subtotal += parseFloat(item.subtotal || 0);
          product.vatAmount += parseFloat(item.vatAmount || 0);
          product.totalAmount += parseFloat(item.totalWithVAT || item.subtotal || 0);
          product.transactionCount++;
        });
      }
    });

    // Convert to array and sort by VAT amount
    return Array.from(productMap.values())
      .map(p => ({
        ...p,
        subtotal: parseFloat(p.subtotal.toFixed(2)),
        vatAmount: parseFloat(p.vatAmount.toFixed(2)),
        totalAmount: parseFloat(p.totalAmount.toFixed(2)),
        averagePrice: parseFloat((p.totalAmount / p.quantitySold).toFixed(2))
      }))
      .sort((a, b) => b.vatAmount - a.vatAmount);
  }

  /**
   * Format sale for detailed report
   * @param {Object} sale - Sale record
   * @returns {Object} Formatted sale
   */
  formatSaleForReport(sale) {
    return {
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      cashier: sale.cashier ? sale.cashier.fullName : sale.cashierName,
      subtotal: parseFloat(sale.subtotal),
      vatAmount: parseFloat(sale.vatAmount),
      vatRate: parseFloat(sale.vatRate),
      totalAmount: parseFloat(sale.totalAmount),
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      orderType: sale.orderType,
      itemCount: sale.items ? sale.items.length : 0
    };
  }

  /**
   * Check compliance status
   * @param {Object} summary - VAT summary
   * @returns {String} Compliance status
   */
  checkCompliance(summary) {
    // Check if VAT calculations are within acceptable range
    const expectedVAT = summary.netSubtotal * vatService.getVATRate();
    const difference = Math.abs(summary.netVATAmount - expectedVAT);
    const tolerance = summary.netSubtotal * 0.001; // 0.1% tolerance

    if (difference <= tolerance) {
      return 'COMPLIANT';
    } else if (difference <= tolerance * 2) {
      return 'REVIEW_REQUIRED';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  /**
   * Find discrepancies in VAT calculations
   * @param {Array} sales - Array of sales
   * @returns {Array} Discrepancies found
   */
  findDiscrepancies(sales) {
    const discrepancies = [];

    sales.forEach(sale => {
      const validation = vatService.validateVATCalculation({
        subtotal: parseFloat(sale.subtotal),
        vatAmount: parseFloat(sale.vatAmount),
        totalAmount: parseFloat(sale.totalAmount),
        vatRate: parseFloat(sale.vatRate)
      });

      if (!validation.isValid) {
        discrepancies.push({
          saleNumber: sale.saleNumber,
          saleDate: sale.saleDate,
          expectedVAT: validation.expectedVAT,
          actualVAT: validation.actualVAT,
          difference: validation.vatDifference,
          message: validation.message
        });
      }
    });

    return discrepancies;
  }

  /**
   * Get compliance information
   * @returns {Object} Compliance info
   */
  getComplianceInfo() {
    return {
      country: 'Sri Lanka',
      taxAuthority: 'Inland Revenue Department',
      vatRate: vatService.getVATRatePercentage(),
      reportingCurrency: 'LKR',
      reportStandard: 'VAT Act No. 14 of 2002',
      complianceNotes: [
        'VAT registration threshold: LKR 3,000,000 per quarter',
        'VAT return filing: Monthly for registered businesses',
        'Standard VAT rate: 15%',
        'Zero-rated and exempt supplies may apply'
      ]
    };
  }

  /**
   * Generate VAT summary for specific period (daily, monthly, quarterly)
   * @param {String} period - 'daily', 'monthly', 'quarterly'
   * @param {Date} date - Reference date
   * @returns {Promise<Object>} Period VAT report
   */
  async generatePeriodReport(period, date = new Date()) {
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3);
        startDate = new Date(date.getFullYear(), quarter * 3, 1);
        endDate = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        break;

      default:
        throw new Error('Invalid period. Use daily, monthly, or quarterly');
    }

    return this.generateVATReport(startDate, endDate, { 
      groupBy: period === 'quarterly' ? 'month' : 'day' 
    });
  }

  /**
   * Export VAT report to CSV format
   * @param {Object} report - VAT report
   * @returns {String} CSV data
   */
  exportToCSV(report) {
    const lines = [];

    // Header
    lines.push('VAT REPORT - ' + report.complianceInfo.country);
    lines.push('Period: ' + report.reportPeriod.startDate + ' to ' + report.reportPeriod.endDate);
    lines.push('Generated: ' + report.generatedAt);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('Description,Amount (LKR)');
    lines.push(`Total Transactions,${report.summary.totalTransactions}`);
    lines.push(`Gross Subtotal,${report.summary.grossSubtotal}`);
    lines.push(`Gross VAT,${report.summary.grossVATAmount}`);
    lines.push(`Gross Total,${report.summary.grossTotal}`);
    lines.push(`Refunded Amount,${report.summary.refundedAmount}`);
    lines.push(`Refunded VAT,${report.summary.refundedVAT}`);
    lines.push(`Net Subtotal,${report.summary.netSubtotal}`);
    lines.push(`Net VAT Payable,${report.summary.netVATAmount}`);
    lines.push(`Net Total,${report.summary.netTotal}`);
    lines.push('');

    // Grouped data
    if (report.groupedData && report.groupedData.length > 0) {
      lines.push('PERIOD BREAKDOWN');
      lines.push('Period,Transactions,Subtotal,VAT Amount,Total Amount');
      report.groupedData.forEach(group => {
        lines.push(`${group.period},${group.transactionCount},${group.subtotal},${group.vatAmount},${group.totalAmount}`);
      });
      lines.push('');
    }

    // Product breakdown
    if (report.productBreakdown && report.productBreakdown.length > 0) {
      lines.push('PRODUCT BREAKDOWN');
      lines.push('Product ID,Product Name,Qty Sold,Subtotal,VAT Amount,Total');
      report.productBreakdown.forEach(product => {
        lines.push(`${product.productId},${product.productName},${product.quantitySold},${product.subtotal},${product.vatAmount},${product.totalAmount}`);
      });
    }

    return lines.join('\n');
  }
}

module.exports = new VATReportService();
