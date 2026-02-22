const AuditLog = require('../models/AuditLog');

/**
 * Log a system activity
 * @param {Object} data Log data
 * @param {number} data.userId User performing the action
 * @param {string} data.action Action name (e.g. LOGIN, LOGOUT, SALE_CREATED)
 * @param {string} data.resourceType Type of resource affected (e.g. auth, sale, product)
 * @param {string} data.resourceId ID of the resource affected
 * @param {string} data.description Human readable description
 * @param {Object} data.metadata Additional context JSON
 * @param {Object} req Express request object (optional, for IP and UserAgent)
 */
const logActivity = async (data, req = null) => {
    try {
        const logData = { ...data };

        if (req) {
            logData.ipAddress = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
            logData.userAgent = req.get('User-Agent');

            // If userId is not provided but req.user is available
            if (!logData.userId && req.user) {
                logData.userId = req.user.id;
            }
        }

        await AuditLog.create(logData);
    } catch (error) {
        // We log but don't want to crash the main process if audit logging fails
        console.error('Audit Logging Error:', error);
    }
};

module.exports = {
    logActivity
};
