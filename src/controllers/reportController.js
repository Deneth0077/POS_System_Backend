const reportService = require('../services/reportService');

exports.getDailySalesReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const report = await reportService.getDailySalesReport(date ? new Date(date) : new Date());
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

exports.getMonthlySalesReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const now = new Date();
        const report = await reportService.getMonthlySalesReport(
            year || now.getFullYear(),
            month || now.getMonth() + 1
        );
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

exports.getProfitSummary = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
        }
        const report = await reportService.getProfitSummary(startDate, endDate);
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

exports.getBestSellingItems = async (req, res, next) => {
    try {
        const { limit } = req.query;
        const report = await reportService.getBestSellingItems(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

exports.getOwnerDashboardStats = async (req, res, next) => {
    try {
        const stats = await reportService.getOwnerDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};
