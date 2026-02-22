const reportService = require('../services/reportService');
const { Expense } = require('../models');

exports.getExpenses = async (req, res, next) => {
    try {
        const { startDate, endDate, category } = req.query;
        const whereClause = {};
        if (startDate && endDate) {
            whereClause.date = {
                [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        if (category) {
            whereClause.category = category;
        }
        const expenses = await Expense.findAll({ where: whereClause, order: [['date', 'DESC']] });
        res.json({ success: true, data: expenses });
    } catch (error) {
        next(error);
    }
};

exports.createExpense = async (req, res, next) => {
    try {
        const expense = await Expense.create({
            ...req.body,
            recordedBy: req.user.id
        });
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        next(error);
    }
};

exports.getExpenseStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const whereClause = {};
        if (startDate && endDate) {
            whereClause.date = {
                [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const expenses = await Expense.findAll({ where: whereClause });
        const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const categoryBreakdown = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
            return acc;
        }, {});
        res.json({ success: true, data: { totalAmount, categoryBreakdown } });
    } catch (error) {
        next(error);
    }
};
