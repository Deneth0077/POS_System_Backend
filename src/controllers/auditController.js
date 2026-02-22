const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private (Admin, Manager)
exports.getAuditLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            userId,
            action,
            resourceType,
            startDate,
            endDate
        } = req.query;

        const where = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resourceType) where.resourceType = resourceType;

        if (startDate && endDate) {
            const { Op } = require('sequelize');
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'fullName', 'role']
                }
            ]
        });

        res.status(200).json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: rows
        });
    } catch (error) {
        next(error);
    }
};
