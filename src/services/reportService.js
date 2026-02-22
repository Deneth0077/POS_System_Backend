const { Op } = require('sequelize');
const { Sale, Expense, Product, MenuItem, User, AuditLog, PriceHistory } = require('../models');
const sequelize = require('sequelize');

class ReportService {
    /**
     * Get Daily Sales Report
     */
    async getDailySalesReport(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Sale.findAll({
            where: {
                saleDate: { [Op.between]: [startOfDay, endOfDay] },
                status: { [Op.notIn]: ['voided'] }
            }
        });

        const totalSalesAmount = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
        const numberOfBills = sales.length;

        // Profit calculation
        let totalProfit = 0;
        sales.forEach(sale => {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            items.forEach(item => {
                const cost = parseFloat(item.costPrice || 0);
                const price = parseFloat(item.unitPrice || 0);
                totalProfit += (price - cost) * item.quantity;
            });
        });

        return {
            date: startOfDay,
            totalSalesAmount,
            numberOfBills,
            totalProfit
        };
    }

    /**
     * Get Monthly Sales Report
     */
    async getMonthlySalesReport(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const sales = await Sale.findAll({
            where: {
                saleDate: { [Op.between]: [startDate, endDate] },
                status: { [Op.notIn]: ['voided'] }
            }
        });

        const expenses = await Expense.findAll({
            where: {
                date: { [Op.between]: [startDate, endDate] }
            }
        });

        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        let totalSalesProfit = 0;
        sales.forEach(sale => {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            items.forEach(item => {
                const cost = parseFloat(item.costPrice || 0);
                const price = parseFloat(item.unitPrice || 0);
                totalSalesProfit += (price - cost) * item.quantity;
            });
        });

        const netProfit = totalSalesProfit - totalExpenses;

        return {
            period: `${year}-${month}`,
            totalSales,
            totalExpenses,
            totalSalesProfit,
            netProfit
        };
    }

    /**
     * Get Profit Summary
     */
    async getProfitSummary(startDate, endDate) {
        const sales = await Sale.findAll({
            where: {
                saleDate: { [Op.between]: [new Date(startDate), new Date(endDate)] },
                status: { [Op.notIn]: ['voided'] }
            }
        });

        const expenses = await Expense.findAll({
            where: {
                date: { [Op.between]: [new Date(startDate), new Date(endDate)] }
            }
        });

        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const itemProfits = {};
        let overallSalesProfit = 0;

        sales.forEach(sale => {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            items.forEach(item => {
                const cost = parseFloat(item.costPrice || 0);
                const price = parseFloat(item.unitPrice || 0);
                const profit = (price - cost) * item.quantity;

                overallSalesProfit += profit;

                if (!itemProfits[item.productName]) {
                    itemProfits[item.productName] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0,
                        profit: 0
                    };
                }
                itemProfits[item.productName].quantity += item.quantity;
                itemProfits[item.productName].revenue += price * item.quantity;
                itemProfits[item.productName].profit += profit;
            });
        });

        return {
            startDate,
            endDate,
            overallSalesProfit,
            totalExpenses,
            netProfit: overallSalesProfit - totalExpenses,
            itemProfits: Object.values(itemProfits).sort((a, b) => b.profit - a.profit)
        };
    }

    /**
     * Get Best Selling Items
     */
    async getBestSellingItems(limit = 10) {
        const sales = await Sale.findAll({
            where: { status: { [Op.notIn]: ['voided'] } }
        });

        const stats = {};

        sales.forEach(sale => {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            items.forEach(item => {
                if (!stats[item.productName]) {
                    stats[item.productName] = {
                        name: item.productName,
                        quantity: 0,
                        profit: 0
                    };
                }
                stats[item.productName].quantity += item.quantity;
                const cost = parseFloat(item.costPrice || 0);
                const price = parseFloat(item.unitPrice || 0);
                stats[item.productName].profit += (price - cost) * item.quantity;
            });
        });

        const mostSoldByQuantity = Object.values(stats).sort((a, b) => b.quantity - a.quantity).slice(0, limit);
        const mostProfitable = Object.values(stats).sort((a, b) => b.profit - a.profit).slice(0, limit);

        return {
            mostSoldByQuantity,
            mostProfitable
        };
    }

    /**
     * Get Remote Monitoring Dashboard Stats
     */
    /**
     * Get Remote Monitoring Dashboard Stats
     */
    async getOwnerDashboardStats() {
        try {
            const today = new Date();
            const dailyReport = await this.getDailySalesReport(today);

            const monthlyReport = await this.getMonthlySalesReport(today.getFullYear(), today.getMonth() + 1);

            const bestSelling = await this.getBestSellingItems(5);

            // Low stock alerts
            const models = require('../models');
            const StockAlert = models.StockAlert;
            const Ingredient = models.Ingredient;
            const Sale = models.Sale;

            const lowStockAlerts = await StockAlert.findAll({
                where: { isResolved: false },
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [{ model: Ingredient, as: 'ingredient' }]
            });


            // Recent bills
            const recentBills = await Sale.findAll({
                limit: 10,
                order: [['saleDate', 'DESC']],
                attributes: ['saleNumber', 'totalAmount', 'saleDate', 'status']
            });

            return {
                today: {
                    sales: dailyReport.totalSalesAmount || 0,
                    profit: dailyReport.totalProfit || 0
                },
                monthly: {
                    profit: monthlyReport.netProfit || 0
                },
                bestSelling: bestSelling.mostSoldByQuantity || [],
                lowStockAlerts: lowStockAlerts || [],
                recentBills: recentBills || []
            };
        } catch (error) {
            console.error('Error in getOwnerDashboardStats:', error);
            throw error;
        }
    }

}

module.exports = new ReportService();
