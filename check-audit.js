require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkAuditColumns() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE audit_logs');
        console.log('Columns in audit_logs:', results);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAuditColumns();
