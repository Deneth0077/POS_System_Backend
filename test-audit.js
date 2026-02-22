require('dotenv').config();
const { AuditLog, PriceHistory, Sale, User } = require('./src/models');
const { connectDB } = require('./src/config/database');

async function testAuditLogs() {
    try {
        await connectDB();
        console.log('Testing Audit Logs...');
        const logs = await AuditLog.findAll({ limit: 10 });
        console.log('Audit Logs count:', logs.length);

        console.log('Testing Price History...');
        const history = await PriceHistory.findAll({ limit: 10 });
        console.log('Price History count:', history.length);

        console.log('Testing associations...');
        const priceChange = await PriceHistory.findOne({ include: [{ model: User, as: 'changer' }] });
        if (priceChange) console.log('Changer name:', priceChange.changer.fullName);

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

testAuditLogs();
