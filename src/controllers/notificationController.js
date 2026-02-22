const { Notification, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all notifications for current user/role
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;

        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { userId }, // Specific to user
                    { targetRole: userRole }, // Specific to role
                    { targetRole: 'All' } // Broadcast
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 50 // Limit to last 50
        });

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Usually we would need a separate table for "UserNotificationRead" if it's a broadcast
        // But for simplicity, we'll just delete it or mark it read (assuming personal queues later).
        // For this MVP, let's just mark it read.
        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a notification (Internal helper or API)
exports.createNotification = async ({ title, message, type = 'INFO', targetRole = 'All', userId = null }) => {
    try {
        return await Notification.create({
            title,
            message,
            type,
            targetRole,
            userId
        });
    } catch (error) {
        console.error('Notification Create Error:', error);
    }
};
